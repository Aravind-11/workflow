#!/usr/bin/env python3
"""
NVENTR Bridge with WebRTC — low-latency video + robot control.

Replaces MJPEG streaming with WebRTC (H.264/VP8, adaptive bitrate, ~50-150ms).
Signaling goes through the existing FRP tunnel (HTTP on port 8080).
Media goes through TURN relay on EC2 (UDP, bypasses double-NAT).

Architecture:
    Signaling: Browser → EC2:6100 (FRP) → Jetson:8080 → SDP answer
    Media:     Browser ↔ EC2:3478 (TURN) ↔ Jetson (direct outbound UDP)
"""

import asyncio
import json
import os
import signal
import time
import logging
import numpy as np
import pty
import subprocess
from fractions import Fraction

from aiohttp import web
import aiohttp
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCConfiguration,
    RTCIceServer,
    VideoStreamTrack,
)
from aiortc.contrib.media import MediaRelay
from av import VideoFrame

logger = logging.getLogger("nventr_bridge")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Config from environment
# ---------------------------------------------------------------------------

EC2_IP = os.environ.get("EC2_IP", "3.147.40.247")
TURN_USER = os.environ.get("TURN_USER", "nventr")
TURN_PASS = os.environ.get("TURN_PASS", "nventr2026")
TURN_PORT = os.environ.get("TURN_PORT", "3478")
CAMERA_TOPIC = os.environ.get("CAMERA_TOPIC", "/ascamera/camera_publisher/image_raw")
PORT = int(os.environ.get("BRIDGE_PORT", "8080"))
SPEED_LIMIT = 1.0

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

peer_connections = set()
emergency_stop = False
last_command_time = 0.0
start_time = time.time()

# ---------------------------------------------------------------------------
# ROS2 integration
# ---------------------------------------------------------------------------

ROS2_AVAILABLE = False
ros2_node = None

try:
    import rclpy
    from rclpy.node import Node as _ROS2Node
    from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
    from geometry_msgs.msg import Twist
    from sensor_msgs.msg import Image
    ROS2_AVAILABLE = True
except ImportError:
    _ROS2Node = None
    logger.warning("rclpy not found — running in dry-run mode")

# ---------------------------------------------------------------------------
# WebRTC video track — reads from ROS2 camera topic
# ---------------------------------------------------------------------------

class ROS2VideoTrack(VideoStreamTrack):
    """Captures frames from a ROS2 Image topic and serves them via WebRTC."""

    kind = "video"

    def __init__(self):
        super().__init__()
        self._latest_frame = None
        self._frame_count = 0

    def update_frame(self, img_array):
        self._latest_frame = img_array

    async def recv(self):
        pts, time_base = await self.next_timestamp()

        if self._latest_frame is not None:
            frame = VideoFrame.from_ndarray(self._latest_frame, format="bgr24")
        else:
            frame = VideoFrame.from_ndarray(
                np.zeros((480, 640, 3), dtype=np.uint8), format="bgr24"
            )

        frame.pts = pts
        frame.time_base = time_base
        self._frame_count += 1
        return frame


video_track = ROS2VideoTrack()
media_relay = MediaRelay()

# ---------------------------------------------------------------------------
# ROS2 node with camera subscriber + cmd_vel publisher
# ---------------------------------------------------------------------------

if ROS2_AVAILABLE:
    class BridgeNode(_ROS2Node):
        def __init__(self):
            super().__init__("nventr_bridge")
            self.cmd_pub = self.create_publisher(Twist, "/cmd_vel", 10)
            cam_qos = QoSProfile(
                reliability=ReliabilityPolicy.BEST_EFFORT,
                history=HistoryPolicy.KEEP_LAST,
                depth=1,
            )
            self.cam_sub = self.create_subscription(
                Image, CAMERA_TOPIC, self._on_image, cam_qos
            )
            self.get_logger().info(f"Subscribed to camera: {CAMERA_TOPIC}")
            self.get_logger().info("Publishing to /cmd_vel")

        def _on_image(self, msg):
            try:
                img = np.frombuffer(msg.data, dtype=np.uint8).reshape(
                    msg.height, msg.width, -1
                )
                if msg.encoding == "rgb8":
                    import cv2
                    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                video_track.update_frame(img)
                if video_track._frame_count % 100 == 0:
                    self.get_logger().info(
                        f"Frames received: {video_track._frame_count} "
                        f"({msg.width}x{msg.height} {msg.encoding})"
                    )
            except Exception as e:
                self.get_logger().error(f"Frame conversion error: {e}")

        def publish_velocity(self, linear_x, angular_z):
            msg = Twist()
            msg.linear.x = max(-SPEED_LIMIT, min(SPEED_LIMIT, float(linear_x)))
            msg.angular.z = max(-SPEED_LIMIT, min(SPEED_LIMIT, float(angular_z)))
            self.cmd_pub.publish(msg)

        def stop_robot(self):
            self.cmd_pub.publish(Twist())

# ---------------------------------------------------------------------------
# Fallback: OpenCV camera (when ROS2 not available)
# ---------------------------------------------------------------------------

async def opencv_camera_loop():
    """Fallback camera capture using OpenCV when ROS2 is unavailable."""
    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.warning("No camera found for OpenCV fallback")
            return
        logger.info("OpenCV fallback camera started")
        while True:
            ret, frame = cap.read()
            if ret:
                video_track.update_frame(frame)
            await asyncio.sleep(1 / 30)
    except ImportError:
        logger.warning("OpenCV not available — no video source")
    except Exception as e:
        logger.error(f"OpenCV camera error: {e}")

# ---------------------------------------------------------------------------
# WebRTC signaling
# ---------------------------------------------------------------------------

def get_ice_config():
    return RTCConfiguration(iceServers=[
        RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
        RTCIceServer(
            urls=[f"turn:{EC2_IP}:{TURN_PORT}"],
            username=TURN_USER,
            credential=TURN_PASS,
        ),
    ])


async def handle_webrtc_offer(request):
    """Exchange SDP: receive offer from browser, return answer with video track."""
    body = await request.json()

    offer = RTCSessionDescription(sdp=body["sdp"], type=body["type"])

    # Close old connections first
    for old_pc in list(peer_connections):
        await old_pc.close()
    peer_connections.clear()

    pc = RTCPeerConnection(configuration=get_ice_config())
    peer_connections.add(pc)

    ice_gathering_done = asyncio.Event()

    @pc.on("connectionstatechange")
    async def on_state_change():
        logger.info(f"WebRTC state: {pc.connectionState}")
        if pc.connectionState in ("failed", "closed", "disconnected"):
            await pc.close()
            peer_connections.discard(pc)

    @pc.on("icegatheringstatechange")
    def on_ice_gathering():
        logger.info(f"ICE gathering: {pc.iceGatheringState}")
        if pc.iceGatheringState == "complete":
            ice_gathering_done.set()

    pc.addTrack(media_relay.subscribe(video_track))

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    try:
        await asyncio.wait_for(ice_gathering_done.wait(), timeout=10.0)
        logger.info("ICE gathering complete — sending answer with all candidates")
    except asyncio.TimeoutError:
        logger.warning("ICE gathering timed out — sending answer with partial candidates")

    return web.json_response({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
    })

# ---------------------------------------------------------------------------
# REST endpoints (same API as before)
# ---------------------------------------------------------------------------

async def handle_health(request):
    return web.json_response({
        "status": "healthy",
        "ros2": ROS2_AVAILABLE,
        "webrtc": True,
        "emergency_stop": emergency_stop,
        "active_streams": len(peer_connections),
        "uptime_s": round(time.time() - start_time, 1),
    })


async def handle_status(request):
    return web.json_response({
        "ros2_available": ROS2_AVAILABLE,
        "webrtc_enabled": True,
        "emergency_stop": emergency_stop,
        "active_streams": len(peer_connections),
        "video_frames": video_track._frame_count,
        "last_command_age_s": round(time.time() - last_command_time, 2) if last_command_time else None,
        "ice_servers": {
            "stun": "stun:stun.l.google.com:19302",
            "turn": f"turn:{EC2_IP}:{TURN_PORT}",
        },
    })


async def handle_move(request):
    global last_command_time, emergency_stop
    if emergency_stop:
        return web.json_response(
            {"error": "emergency stop active — POST /api/reset first"}, status=403
        )

    body = await request.json()
    lx = float(body.get("linear_x", 0.0))
    az = float(body.get("angular_z", 0.0))

    if ros2_node:
        ros2_node.publish_velocity(lx, az)
    else:
        logger.info(f"[DRY-RUN] move linear_x={lx} angular_z={az}")

    last_command_time = time.time()
    return web.json_response({"success": True, "linear_x": lx, "angular_z": az})


async def handle_stop(request):
    global emergency_stop, last_command_time
    emergency_stop = True
    last_command_time = 0.0
    if ros2_node:
        ros2_node.stop_robot()
    else:
        logger.info("[DRY-RUN] STOP")
    return web.json_response({"success": True})


async def handle_reset(request):
    global emergency_stop
    emergency_stop = False
    return web.json_response({"success": True, "emergency_stop": False})


async def handle_terminal(request):
    """WebSocket terminal — spawns a bash shell on the Jetson."""
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)

    loop = asyncio.get_event_loop()
    master_fd, slave_fd = pty.openpty()

    proc = await asyncio.create_subprocess_exec(
        "/bin/bash", "--login",
        stdin=slave_fd, stdout=slave_fd, stderr=slave_fd,
        close_fds=True,
    )
    os.close(slave_fd)

    async def read_output():
        while True:
            try:
                data = await loop.run_in_executor(None, os.read, master_fd, 1024)
                if data:
                    await ws.send_str(data.decode(errors="replace"))
            except Exception:
                break

    read_task = asyncio.ensure_future(read_output())

    try:
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                os.write(master_fd, msg.data.encode())
            elif msg.type in (aiohttp.WSMsgType.CLOSE, aiohttp.WSMsgType.ERROR):
                break
    finally:
        read_task.cancel()
        try:
            proc.terminate()
            os.close(master_fd)
        except Exception:
            pass

    return ws


async def handle_mjpeg_stream(request):
    """MJPEG fallback stream — works through FRP tunnel, no TURN needed."""
    import cv2
    response = web.StreamResponse()
    response.content_type = "multipart/x-mixed-replace; boundary=frame"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "no-cache"
    await response.prepare(request)

    try:
        while True:
            if video_track._latest_frame is not None:
                _, jpeg = cv2.imencode(".jpg", video_track._latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                data = (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n\r\n"
                    + jpeg.tobytes() + b"\r\n"
                )
                await response.write(data)
            await asyncio.sleep(1 / 20)  # ~20fps
    except (ConnectionResetError, asyncio.CancelledError):
        pass
    return response


# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------

@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# ---------------------------------------------------------------------------
# Watchdog — auto-stop if commands stop arriving
# ---------------------------------------------------------------------------

async def watchdog():
    global last_command_time, emergency_stop
    while True:
        await asyncio.sleep(0.5)
        if last_command_time == 0.0:
            continue
        if time.time() - last_command_time > 2.0 and not emergency_stop:
            if ros2_node:
                ros2_node.stop_robot()
            last_command_time = 0.0

# ---------------------------------------------------------------------------
# ROS2 spin in background thread
# ---------------------------------------------------------------------------

def ros2_spin_thread():
    rclpy.spin(ros2_node)

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

async def on_shutdown(app):
    coros = [pc.close() for pc in peer_connections]
    await asyncio.gather(*coros)
    peer_connections.clear()
    if ros2_node:
        ros2_node.stop_robot()
        ros2_node.destroy_node()
    if ROS2_AVAILABLE:
        rclpy.shutdown()
    logger.info("Shutdown complete")

# ---------------------------------------------------------------------------
# Static file serving (viewer.html)
# ---------------------------------------------------------------------------

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    global ros2_node, start_time
    start_time = time.time()

    if ROS2_AVAILABLE:
        rclpy.init()
        ros2_node = BridgeNode()
        import threading
        t = threading.Thread(target=ros2_spin_thread, daemon=True)
        t.start()

    app = web.Application(middlewares=[cors_middleware])
    app.on_shutdown.append(on_shutdown)

    app.router.add_get("/health", handle_health)
    app.router.add_get("/api/status", handle_status)
    app.router.add_post("/api/move", handle_move)
    app.router.add_post("/api/stop", handle_stop)
    app.router.add_post("/api/reset", handle_reset)
    app.router.add_post("/api/webrtc/offer", handle_webrtc_offer)
    app.router.add_get("/api/video/stream", handle_mjpeg_stream)
    app.router.add_get("/api/terminal", handle_terminal)

    if os.path.isdir(STATIC_DIR):
        app.router.add_static("/static/", STATIC_DIR)
        app.router.add_get("/", lambda r: web.FileResponse(
            os.path.join(STATIC_DIR, "viewer.html")
        ))

    logger.info(f"NVENTR WebRTC Bridge starting on port {PORT}")
    logger.info(f"ROS2: {ROS2_AVAILABLE} | Camera topic: {CAMERA_TOPIC}")
    logger.info(f"TURN: turn:{EC2_IP}:{TURN_PORT}")
    logger.info(f"Endpoints:")
    logger.info(f"  GET  /                 — WebRTC viewer")
    logger.info(f"  GET  /health           — health check")
    logger.info(f"  GET  /api/status       — detailed status")
    logger.info(f"  POST /api/move         — {{linear_x, angular_z}}")
    logger.info(f"  POST /api/stop         — emergency stop")
    logger.info(f"  POST /api/reset        — clear emergency stop")
    logger.info(f"  POST /api/webrtc/offer — WebRTC signaling")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(watchdog())

    if not ROS2_AVAILABLE:
        loop.create_task(opencv_camera_loop())

    web.run_app(app, host="0.0.0.0", port=PORT, loop=loop)


if __name__ == "__main__":
    main()
