#!/bin/bash
# ============================================================
# NVENTR Auto-Start — runs on Jetson boot
# Starts: FRP client, camera node, robot bringup, WebRTC bridge
# ============================================================

LOG_DIR="/home/jetson/nventr_logs"
mkdir -p "$LOG_DIR"

export HOME=/home/jetson

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_DIR/autostart.log"; }

log "=== NVENTR Auto-Start ==="

# Wait for network
for i in $(seq 1 30); do
    if ping -c 1 8.8.8.8 &>/dev/null; then
        log "Network up"
        break
    fi
    sleep 2
done

# 1. FRP Client
log "Starting FRP client..."
pkill -f frpc 2>/dev/null || true
sleep 1
cd /home/jetson/frp
nohup ./frpc -c ./frpc.ini > "$LOG_DIR/frpc.log" 2>&1 &
sleep 3
if pgrep -f "frpc" > /dev/null; then
    log "FRP client OK"
else
    log "FRP client FAILED"
fi

# Source ROS2
source /opt/ros/humble/setup.bash
source /home/jetson/yahboomcar_ros2_ws/yahboomcar_ws/install/setup.bash

# 2. Robot Bringup
log "Starting robot bringup..."
nohup ros2 launch yahboomcar_bringup yahboomcar_bringup_A1_launch.py \
    > "$LOG_DIR/bringup.log" 2>&1 &
sleep 5
if pgrep -f "yahboomcar_bringup" > /dev/null; then
    log "Robot bringup OK"
else
    log "Robot bringup FAILED"
fi

# 3. Camera
log "Starting camera..."
nohup ros2 launch yahboomcar_depth camera_app.launch.py \
    > "$LOG_DIR/camera.log" 2>&1 &
sleep 5
if pgrep -f "ascamera" > /dev/null; then
    log "Camera OK"
else
    log "Camera FAILED"
fi

# 4. WebRTC Bridge
log "Starting WebRTC bridge..."
kill $(lsof -ti:8080) 2>/dev/null || true
sleep 1
export CAMERA_TOPIC=/ascamera_hp60c/camera_publisher/rgb0/image
export EC2_IP=3.147.40.247
nohup python3 /home/jetson/nventr_bridge_webrtc.py \
    > "$LOG_DIR/bridge.log" 2>&1 &
sleep 3
if pgrep -f "nventr_bridge_webrtc" > /dev/null; then
    log "WebRTC bridge OK"
else
    log "WebRTC bridge FAILED"
fi

log "=== Auto-Start Complete ==="
log "Logs: $LOG_DIR/"
