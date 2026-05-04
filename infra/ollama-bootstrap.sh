#!/bin/bash
set -euxo pipefail

LOG=/var/log/ollama-bootstrap.log
exec > >(tee -a "$LOG") 2>&1

echo "[bootstrap] $(date -u) starting"

# Install ollama
curl -fsSL https://ollama.com/install.sh | sh

# Bind to all interfaces and keep models warm
mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=24h"
Environment="OLLAMA_NUM_PARALLEL=2"
EOF

systemctl daemon-reload
systemctl enable --now ollama
sleep 5

# Wait for the server to come up
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "[bootstrap] ollama ready"
    break
  fi
  echo "[bootstrap] waiting for ollama ($i)..."
  sleep 2
done

ollama pull llama3.1:8b-instruct-q4_K_M
ollama run llama3.1:8b-instruct-q4_K_M "ping" || true

echo "[bootstrap] $(date -u) done"
