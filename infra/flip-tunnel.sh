#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Flip the nventr-wms ECS service onto a task definition that includes a
# Cloudflare Tunnel sidecar. Single-use bootstrap: once tunnel is live we
# also lock down port 3000 on the task SG.
#
# Usage:
#   ./flip-tunnel.sh '<CF_TUNNEL_TOKEN_FROM_SHAO>'
#
# What it does:
#   1. Substitutes the token into the task-def template.
#   2. Registers a new revision of the `nventr-wms` task definition.
#   3. Updates the `nventr-wms` service in cluster `NventrAgentCPU` to the
#      new revision.
#   4. Waits for the service to reach steady state.
#   5. Tails the cloudflared sidecar logs so you can confirm
#      "Registered tunnel connection".
# -----------------------------------------------------------------------------
set -euo pipefail

TOKEN="${1:?Pass the Cloudflare tunnel token as the first argument}"

REGION="${AWS_REGION:-us-east-1}"
CLUSTER="${ECS_CLUSTER:-NventrAgentCPU}"
SERVICE="${ECS_SERVICE:-nventr-wms}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$HERE/nventr-wms-taskdef.template.json"
RENDERED="$(mktemp -t taskdef-XXXX.json)"
trap 'rm -f "$RENDERED"' EXIT

[[ -f "$TEMPLATE" ]] || { echo "Template not found: $TEMPLATE" >&2; exit 1; }

# 1. Render the token in (use python so token characters can't break sed)
python3 -c "
import json, sys, pathlib
tpl = pathlib.Path('$TEMPLATE').read_text()
out = tpl.replace('__CF_TUNNEL_TOKEN__', '$TOKEN')
json.loads(out)  # parse-check
pathlib.Path('$RENDERED').write_text(out)
"

# 2. Register the new revision
echo ">> Registering new task definition revision..."
NEW_TD=$(aws ecs register-task-definition \
  --region "$REGION" \
  --cli-input-json "file://$RENDERED" \
  --query 'taskDefinition.taskDefinitionArn' --output text)
echo "   $NEW_TD"

# 3. Update the service to use it
echo ">> Updating service to new revision (force-new-deployment)..."
aws ecs update-service \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$NEW_TD" \
  --force-new-deployment \
  --query 'service.{name:serviceName,td:taskDefinition,desired:desiredCount}' \
  --output table

# 4. Wait for steady state
echo ">> Waiting for service to reach steady state (typically ~3 min)..."
aws ecs wait services-stable \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --services "$SERVICE"
echo "   Service is stable."

# 5. Tail cloudflared logs so we can see the tunnel come up
echo ">> Tailing cloudflared logs (Ctrl-C when you see 'Registered tunnel connection'):"
aws logs tail /ecs/nventr-wms-cloudflared \
  --region "$REGION" \
  --since 5m \
  --follow
