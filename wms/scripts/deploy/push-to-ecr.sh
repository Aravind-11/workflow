#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Build the WMS Docker image and push it to AWS ECR.
#
# Usage:
#   AWS_REGION=us-east-1 AWS_ACCOUNT_ID=123456789012 ./scripts/deploy/push-to-ecr.sh
#
# Optional env:
#   ECR_REPO        ECR repository name (default: nventr-wms)
#   IMAGE_TAG       extra tag in addition to git SHA + 'latest' (default: empty)
#   PLATFORM        target platform (default: linux/amd64 — required for Fargate)
#
# Prereqs:
#   - awscli v2 logged in (`aws sts get-caller-identity` works)
#   - docker (or docker buildx) running locally
#   - IAM perms: ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability,
#     ecr:PutImage, ecr:InitiateLayerUpload, ecr:UploadLayerPart,
#     ecr:CompleteLayerUpload, ecr:CreateRepository (only if --create used)
# -----------------------------------------------------------------------------
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION (e.g. us-east-1)}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID (12-digit account number)}"

ECR_REPO="${ECR_REPO:-nventr-wms}"
PLATFORM="${PLATFORM:-linux/amd64}"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_BASE="${REGISTRY}/${ECR_REPO}"

echo ">>> Region:    ${AWS_REGION}"
echo ">>> Account:   ${AWS_ACCOUNT_ID}"
echo ">>> Repo:      ${ECR_REPO}"
echo ">>> Platform:  ${PLATFORM}"
echo ">>> Image:     ${IMAGE_BASE}:{${GIT_SHA},latest${IMAGE_TAG:+,${IMAGE_TAG}}}"

# 1. Ensure the ECR repository exists (idempotent).
if ! aws ecr describe-repositories \
        --region "${AWS_REGION}" \
        --repository-names "${ECR_REPO}" >/dev/null 2>&1; then
    echo ">>> Creating ECR repo ${ECR_REPO}…"
    aws ecr create-repository \
        --region "${AWS_REGION}" \
        --repository-name "${ECR_REPO}" \
        --image-scanning-configuration scanOnPush=true \
        --image-tag-mutability MUTABLE >/dev/null
fi

# 2. Login docker to ECR.
echo ">>> Logging into ECR…"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

# 3. Build the image (cross-arch friendly via buildx).
TAGS=(-t "${IMAGE_BASE}:${GIT_SHA}" -t "${IMAGE_BASE}:latest")
if [[ -n "${IMAGE_TAG:-}" ]]; then
    TAGS+=(-t "${IMAGE_BASE}:${IMAGE_TAG}")
fi

echo ">>> Building image for ${PLATFORM}…"
docker buildx build \
    --platform "${PLATFORM}" \
    --push \
    "${TAGS[@]}" \
    .

echo ""
echo "✅ Pushed:"
for t in "${TAGS[@]/#-t }"; do
    [[ "$t" == -t ]] && continue
    echo "   $t"
done
echo ""
echo "Next steps:"
echo "   1) Update your ECS task definition image to: ${IMAGE_BASE}:${GIT_SHA}"
echo "   2) aws ecs update-service --force-new-deployment --cluster <c> --service <s>"
