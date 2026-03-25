#!/bin/bash
# ============================================================
# Quick Start — Yahboom A1 via NVENTR Bridge
# ============================================================
# Run on the Jetson to start the FRP client. Then manually open
# two more terminals for the bringup and bridge.
#
# Usage:
#   chmod +x start_robot.sh
#   ./start_robot.sh
# ============================================================

set -euo pipefail

FRP_DIR="$HOME/frp"

echo "=== NVENTR Yahboom A1 Quick Start ==="
echo ""

# ---- Start FRP client ----
echo "[1/3] Starting FRP client..."
cd "$FRP_DIR"
pkill -f frpc 2>/dev/null || true
sleep 1
nohup ./frpc -c ./frpc.ini > frpc.log 2>&1 &
sleep 2

if pgrep -f "frpc" > /dev/null; then
    echo "  [OK] FRP Client running (PID: $(pgrep -f 'frpc -c'))"
    echo ""
    tail -3 "$FRP_DIR/frpc.log"
else
    echo "  [ERROR] FRP Client failed to start"
    echo "  Check: tail -f $FRP_DIR/frpc.log"
    exit 1
fi

echo ""
echo "-----------------------------------------------------------"
echo "[2/3] Open a NEW terminal and run:"
echo ""
echo "  source /opt/ros/humble/setup.bash"
echo "  source ~/yahboomcar_ros2_ws/yahboomcar_ws/install/setup.bash"
echo "  ros2 launch yahboomcar_bringup yahboomcar_bringup_A1_launch.py"
echo ""
echo "-----------------------------------------------------------"
echo "[3/3] Open ANOTHER terminal and run:"
echo ""
echo "  source /opt/ros/humble/setup.bash"
echo "  source ~/yahboomcar_ros2_ws/yahboomcar_ws/install/setup.bash"
echo "  python3 ~/nventr_bridge.py"
echo ""
echo "-----------------------------------------------------------"
echo ""
echo "Once all 3 are running, test from any machine:"
echo "  curl http://<EC2_IP>:6100/health"
echo "  curl -X POST http://<EC2_IP>:6100/api/move \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"linear_x\":0.3,\"angular_z\":0.0}'"
echo ""
