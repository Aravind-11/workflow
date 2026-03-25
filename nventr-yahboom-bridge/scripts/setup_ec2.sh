#!/bin/bash
# ============================================================
# EC2 Setup Script — FRP Server for NVENTR Yahboom A1 Bridge
# ============================================================
# Run this on your EC2 instance (Amazon Linux 2 / Ubuntu).
#
# Usage:
#   chmod +x setup_ec2.sh
#   ./setup_ec2.sh [FRP_TOKEN]
#
# After running, configure your EC2 Security Group to allow
# inbound TCP on ports 7000, 6000, and 6100.
# ============================================================

set -euo pipefail

FRP_VERSION="0.49.0"
FRP_DIR="$HOME/frp"
FRP_TOKEN="${1:-s3cureT0ken_REPLACETHIS}"

echo "=== NVENTR EC2 FRP Server Setup ==="
echo ""

# ---- Download & extract FRP ----
if [ -d "$FRP_DIR" ] && [ -f "$FRP_DIR/frps" ]; then
    echo "[OK] FRP already installed at $FRP_DIR"
else
    echo "[*] Downloading FRP v${FRP_VERSION} (linux/amd64)..."
    cd /tmp
    wget -q "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz"
    tar xzf "frp_${FRP_VERSION}_linux_amd64.tar.gz"
    mv "frp_${FRP_VERSION}_linux_amd64" "$FRP_DIR"
    rm -f "frp_${FRP_VERSION}_linux_amd64.tar.gz"
    echo "[OK] FRP installed at $FRP_DIR"
fi

# ---- Write server config ----
cat > "$FRP_DIR/frps.ini" << EOF
[common]
bind_port = 7000
token = ${FRP_TOKEN}
EOF

echo "[OK] Config written to $FRP_DIR/frps.ini"

# ---- Start FRP server ----
pkill -f "frps" 2>/dev/null || true
sleep 1

cd "$FRP_DIR"
nohup ./frps -c ./frps.ini > frps.log 2>&1 &
sleep 2

if pgrep -f "frps" > /dev/null; then
    echo "[OK] FRP server started (PID: $(pgrep -f 'frps -c'))"
    echo ""
    tail -5 "$FRP_DIR/frps.log"
else
    echo "[ERROR] FRP server failed to start. Check $FRP_DIR/frps.log"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Required EC2 Security Group inbound rules:"
echo "  TCP 7000  0.0.0.0/0  (FRP control port)"
echo "  TCP 6000  0.0.0.0/0  (SSH tunnel)"
echo "  TCP 6100  0.0.0.0/0  (HTTP API tunnel)"
echo ""
echo "To check logs:  tail -f $FRP_DIR/frps.log"
echo "To stop:        pkill -f frps"
