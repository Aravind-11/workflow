#!/usr/bin/env python3
"""
NVENTR Bridge — HTTP API gateway for Yahboom A1 robot control via ROS2.

Runs on the Jetson (port 8080). Receives HTTP commands from the NVENTR/Theia
app (forwarded through an FRP tunnel on EC2) and publishes geometry_msgs/Twist
messages to the ROS2 /cmd_vel topic.

Architecture:
    NVENTR App → EC2:6100 → (FRP tunnel) → Jetson:8080 → ROS2 /cmd_vel → Motors
"""

import json
import time
import signal
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# ---------------------------------------------------------------------------
# ROS2 integration — imported at runtime so the bridge can also run in
# "dry-run" mode (useful for testing without a ROS2 environment).
# ---------------------------------------------------------------------------

ROS2_AVAILABLE = False
ros2_node = None
cmd_vel_publisher = None

try:
    import rclpy
    from rclpy.node import Node as _ROS2Node
    from geometry_msgs.msg import Twist
    ROS2_AVAILABLE = True
except ImportError:
    _ROS2Node = None
    pass

SPEED_LIMIT = 1.0
EMERGENCY_STOP_ACTIVE = False
LAST_COMMAND_TIME = 0.0
COMMAND_TIMEOUT = 2.0  # auto-stop if no command received within this window


# ---------------------------------------------------------------------------
# ROS2 node — only defined when rclpy is available
# ---------------------------------------------------------------------------

NventrBridgeNode = None

if ROS2_AVAILABLE:
    class NventrBridgeNode(_ROS2Node):
        def __init__(self):
            super().__init__("nventr_bridge")
            self.publisher = self.create_publisher(Twist, "/cmd_vel", 10)
            self.get_logger().info("nventr_bridge ROS2 node initialised — publishing to /cmd_vel")

        def publish_velocity(self, linear_x: float, angular_z: float):
            msg = Twist()
            msg.linear.x = max(-SPEED_LIMIT, min(SPEED_LIMIT, linear_x))
            msg.angular.z = max(-SPEED_LIMIT, min(SPEED_LIMIT, angular_z))
            self.publisher.publish(msg)
            self.get_logger().info(f"cmd_vel → linear_x={msg.linear.x:.2f}  angular_z={msg.angular.z:.2f}")

        def stop(self):
            msg = Twist()  # all zeros
            self.publisher.publish(msg)
            self.get_logger().info("cmd_vel → STOP (0, 0)")


def init_ros2():
    global ros2_node, cmd_vel_publisher
    if not ROS2_AVAILABLE:
        print("[WARN] rclpy not found — running in dry-run mode (no ROS2 publishing)")
        return
    rclpy.init()
    ros2_node = NventrBridgeNode()
    spin_thread = threading.Thread(target=rclpy.spin, args=(ros2_node,), daemon=True)
    spin_thread.start()


def shutdown_ros2():
    if ros2_node:
        ros2_node.stop()
        ros2_node.destroy_node()
    if ROS2_AVAILABLE:
        rclpy.shutdown()


# ---------------------------------------------------------------------------
# Watchdog — auto-stops the robot if commands stop arriving
# ---------------------------------------------------------------------------

def watchdog_loop():
    global LAST_COMMAND_TIME, EMERGENCY_STOP_ACTIVE
    while True:
        time.sleep(0.5)
        if LAST_COMMAND_TIME == 0.0:
            continue
        elapsed = time.time() - LAST_COMMAND_TIME
        if elapsed > COMMAND_TIMEOUT and not EMERGENCY_STOP_ACTIVE:
            if ros2_node:
                ros2_node.stop()
            LAST_COMMAND_TIME = 0.0


# ---------------------------------------------------------------------------
# HTTP request handler
# ---------------------------------------------------------------------------

class BridgeHandler(BaseHTTPRequestHandler):
    """Handles /health, /api/move, /api/stop, /api/status endpoints."""

    def _send_json(self, status_code: int, body: dict):
        payload = json.dumps(body).encode()
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw)

    # --- CORS preflight ---
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # --- GET endpoints ---
    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "ros2": ROS2_AVAILABLE,
                "emergency_stop": EMERGENCY_STOP_ACTIVE,
                "uptime_s": round(time.time() - SERVER_START_TIME, 1),
            })
        elif self.path == "/api/status":
            self._send_json(200, {
                "ros2_available": ROS2_AVAILABLE,
                "emergency_stop": EMERGENCY_STOP_ACTIVE,
                "last_command_age_s": round(time.time() - LAST_COMMAND_TIME, 2) if LAST_COMMAND_TIME else None,
            })
        else:
            self._send_json(404, {"error": "not found"})

    # --- POST endpoints ---
    def do_POST(self):
        global LAST_COMMAND_TIME, EMERGENCY_STOP_ACTIVE

        if self.path == "/api/move":
            if EMERGENCY_STOP_ACTIVE:
                self._send_json(403, {"error": "emergency stop active — send /api/stop then /api/reset first"})
                return

            body = self._read_body()
            linear_x = float(body.get("linear_x", 0.0))
            angular_z = float(body.get("angular_z", 0.0))

            if ros2_node:
                ros2_node.publish_velocity(linear_x, angular_z)
            else:
                print(f"[DRY-RUN] move linear_x={linear_x} angular_z={angular_z}")

            LAST_COMMAND_TIME = time.time()
            self._send_json(200, {
                "success": True,
                "emergency_stop": EMERGENCY_STOP_ACTIVE,
                "linear_x": linear_x,
                "angular_z": angular_z,
            })

        elif self.path == "/api/stop":
            EMERGENCY_STOP_ACTIVE = True
            if ros2_node:
                ros2_node.stop()
            else:
                print("[DRY-RUN] STOP")
            LAST_COMMAND_TIME = 0.0
            self._send_json(200, {"success": True})

        elif self.path == "/api/reset":
            EMERGENCY_STOP_ACTIVE = False
            self._send_json(200, {"success": True, "emergency_stop": False})

        else:
            self._send_json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

SERVER_START_TIME = time.time()


def main():
    global SERVER_START_TIME
    port = 8080

    init_ros2()

    SERVER_START_TIME = time.time()

    wd = threading.Thread(target=watchdog_loop, daemon=True)
    wd.start()

    server = HTTPServer(("0.0.0.0", port), BridgeHandler)
    print(f"NVENTR API Server running on port {port}")
    print(f"ROS2 available: {ROS2_AVAILABLE}")
    print(f"Endpoints:")
    print(f"  GET  /health      — health check")
    print(f"  GET  /api/status  — detailed status")
    print(f"  POST /api/move    — {{linear_x, angular_z}}")
    print(f"  POST /api/stop    — emergency stop")
    print(f"  POST /api/reset   — clear emergency stop")

    def graceful_shutdown(sig, frame):
        print("\nShutting down...")
        server.shutdown()
        shutdown_ros2()
        sys.exit(0)

    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        graceful_shutdown(None, None)


if __name__ == "__main__":
    main()
