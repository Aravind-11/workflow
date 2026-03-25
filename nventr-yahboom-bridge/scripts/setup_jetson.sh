#!/bin/bash
# ============================================================
# Jetson Setup Script — FRP Client + NVENTR Bridge
# ============================================================
# Run this on your Jetson Nano/Orin.
#
# Usage:
#   chmod +x setup_jetson.sh
#   ./setup_jetson.sh <EC2_PUBLIC_IP> [FRP_TOKEN]
#
# Example:
#   ./setup_jetson.sh 3.145.50.129 mySecretToken123
# ============================================================

set -euo pipefail

FRP_VERSION="0.49.0"
FRP_DIR="$HOME/frp"

EC2_IP="${1:-}"
FRP_TOKEN="${2:-s3cureT0ken_REPLACETHIS}"

if [ -z "$EC2_IP" ]; then
    echo "Usage: $0 <EC2_PUBLIC_IP> [FRP_TOKEN]"
    echo "Example: $0 3.145.50.129 mySecretToken123"
    exit 1
fi

echo "=== NVENTR Jetson FRP Client Setup ==="
echo "EC2 IP: $EC2_IP"
echo ""

# ---- Download & extract FRP (ARM64) ----
if [ -d "$FRP_DIR" ] && [ -f "$FRP_DIR/frpc" ]; then
    echo "[OK] FRP already installed at $FRP_DIR"
else
    echo "[*] Downloading FRP v${FRP_VERSION} (linux/arm64)..."
    cd /tmp
    wget -q "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_arm64.tar.gz"
    tar xzf "frp_${FRP_VERSION}_linux_arm64.tar.gz"
    mv "frp_${FRP_VERSION}_linux_arm64" "$FRP_DIR"
    rm -f "frp_${FRP_VERSION}_linux_arm64.tar.gz"
    echo "[OK] FRP installed at $FRP_DIR"
fi

# ---- Write client config ----
cat > "$FRP_DIR/frpc.ini" << EOF
[common]
server_addr = ${EC2_IP}
server_port = 7000
token = ${FRP_TOKEN}

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 6000

[http]
type = tcp
local_ip = 127.0.0.1
local_port = 8080
remote_port = 6100
EOF

echo "[OK] Config written to $FRP_DIR/frpc.ini"

# ---- Deploy nventr_bridge.py ----
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_SRC="$SCRIPT_DIR/../nventr_bridge.py"

if [ -f "$BRIDGE_SRC" ]; then
    cp "$BRIDGE_SRC" "$HOME/nventr_bridge.py"
    echo "[OK] nventr_bridge.py deployed to $HOME/nventr_bridge.py"
else
    echo "[WARN] nventr_bridge.py not found at $BRIDGE_SRC — deploy it manually"
fi

# ---- Start FRP client ----
pkill -f "frpc" 2>/dev/null || true
sleep 1

cd "$FRP_DIR"
nohup ./frpc -c ./frpc.ini > frpc.log 2>&1 &
sleep 2

if pgrep -f "frpc" > /dev/null; then
    echo "[OK] FRP client started (PID: $(pgrep -f 'frpc -c'))"
    echo ""
    tail -5 "$FRP_DIR/frpc.log"
else
    echo "[ERROR] FRP client failed to start. Check $FRP_DIR/frpc.log"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps (run in separate terminals):"
echo ""
echo "  Terminal 1 — Robot bringup:"
echo "    source /opt/ros/humble/setup.bash"
echo "    source ~/yahboomcar_ros2_ws/yahboomcar_ws/install/setup.bash"
echo "    ros2 launch yahboomcar_bringup yahboomcar_bringup_A1_launch.py"
echo ""
echo "  Terminal 2 — NVENTR Bridge:"
echo "    source /opt/ros/humble/setup.bash"
echo "    source ~/yahboomcar_ros2_ws/yahboomcar_ws/install/setup.bash"
echo "    python3 ~/nventr_bridge.py"
echo ""
echo "To check FRP logs: tail -f $FRP_DIR/frpc.log"
echo "To stop FRP:       pkill -f frpc"
