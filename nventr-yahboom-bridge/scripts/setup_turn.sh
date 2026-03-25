#!/bin/bash
# ============================================================
# EC2 TURN Server Setup (coturn) — for WebRTC media relay
# ============================================================
# Run this on your EC2 instance AFTER setup_ec2.sh.
#
# Usage:
#   chmod +x setup_turn.sh
#   ./setup_turn.sh [TURN_USER] [TURN_PASS]
#
# After running, add these inbound rules to EC2 Security Group:
#   UDP 3478        (TURN signaling)
#   TCP 3478        (TURN fallback)
#   UDP 49152-49252 (media relay range)
# ============================================================

set -euo pipefail

TURN_USER="${1:-nventr}"
TURN_PASS="${2:-nventr2026}"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "=== TURN Server (coturn) Setup ==="
echo "Public IP: $PUBLIC_IP"
echo ""

# ---- Install coturn ----
if command -v turnserver &> /dev/null; then
    echo "[OK] coturn already installed"
else
    echo "[*] Installing coturn..."
    sudo yum install -y coturn 2>/dev/null || sudo apt-get install -y coturn
    echo "[OK] coturn installed"
fi

# ---- Write config ----
sudo tee /etc/turnserver.conf > /dev/null << EOF
listening-port=3478
realm=nventr
external-ip=${PUBLIC_IP}
min-port=49152
max-port=49252
fingerprint
lt-cred-mech
user=${TURN_USER}:${TURN_PASS}
no-tls
no-dtls
log-file=/var/log/turnserver.log
pidfile=/var/run/turnserver.pid
EOF

echo "[OK] Config written to /etc/turnserver.conf"

# ---- Start coturn ----
sudo pkill turnserver 2>/dev/null || true
sleep 1

sudo turnserver -c /etc/turnserver.conf -o &
sleep 2

if pgrep turnserver > /dev/null; then
    echo "[OK] TURN server running (PID: $(pgrep turnserver))"
else
    echo "[ERROR] TURN server failed to start"
    echo "Try: sudo turnserver -c /etc/turnserver.conf (foreground for debug)"
    exit 1
fi

echo ""
echo "=== TURN Setup Complete ==="
echo ""
echo "TURN URI:  turn:${PUBLIC_IP}:3478"
echo "Username:  ${TURN_USER}"
echo "Password:  ${TURN_PASS}"
echo ""
echo "Add these EC2 Security Group inbound rules:"
echo "  UDP 3478        0.0.0.0/0  (TURN signaling)"
echo "  TCP 3478        0.0.0.0/0  (TURN TCP fallback)"
echo "  UDP 49152-49252 0.0.0.0/0  (media relay ports)"
echo ""
echo "Test from any machine:"
echo "  turnutils_uclient -u ${TURN_USER} -w ${TURN_PASS} ${PUBLIC_IP}"
