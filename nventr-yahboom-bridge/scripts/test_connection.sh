#!/bin/bash
# ============================================================
# Connection Test Script — Verify NVENTR → EC2 → Jetson Pipeline
# ============================================================
# Run from any machine that has internet access.
#
# Usage:
#   chmod +x test_connection.sh
#   ./test_connection.sh <EC2_PUBLIC_IP>
#
# Example:
#   ./test_connection.sh 3.145.50.129
# ============================================================

set -euo pipefail

EC2_IP="${1:-}"
PORT="${2:-6100}"

if [ -z "$EC2_IP" ]; then
    echo "Usage: $0 <EC2_PUBLIC_IP> [PORT]"
    echo "Example: $0 3.145.50.129 6100"
    exit 1
fi

BASE="http://${EC2_IP}:${PORT}"
PASS=0
FAIL=0

echo "=== NVENTR Pipeline Connection Test ==="
echo "Target: $BASE"
echo ""

# ---- Test 1: Health check ----
echo "[Test 1] GET /health"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/health" 2>&1) || true
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    PASS=$((PASS + 1))
else
    echo "  FAIL (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ---- Test 2: Status check ----
echo "[Test 2] GET /api/status"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/status" 2>&1) || true
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    PASS=$((PASS + 1))
else
    echo "  FAIL (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ---- Test 3: Move forward ----
echo "[Test 3] POST /api/move (linear_x=0.1, angular_z=0.0)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/move" \
    -H "Content-Type: application/json" \
    -d '{"linear_x":0.1,"angular_z":0.0}' 2>&1) || true
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    PASS=$((PASS + 1))
else
    echo "  FAIL (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ---- Test 4: Stop ----
echo "[Test 4] POST /api/stop"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/stop" \
    -H "Content-Type: application/json" 2>&1) || true
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    PASS=$((PASS + 1))
else
    echo "  FAIL (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ---- Test 5: Reset e-stop ----
echo "[Test 5] POST /api/reset"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/reset" \
    -H "Content-Type: application/json" 2>&1) || true
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    PASS=$((PASS + 1))
else
    echo "  FAIL (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ---- Summary ----
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Troubleshooting:"
    echo "  1. Is FRP server running on EC2?    ssh ec2 'ps aux | grep frps'"
    echo "  2. Is FRP client running on Jetson?  ssh jetson 'ps aux | grep frpc'"
    echo "  3. Is nventr_bridge.py running?      ssh jetson 'ps aux | grep nventr_bridge'"
    echo "  4. EC2 Security Group allows TCP ${PORT} inbound?"
    exit 1
fi
