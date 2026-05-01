# Deploying Nventr WMS to AWS

This guide takes the app from "works on my laptop" to "running on a domain"
in three layers:

1. **Build & push** the container image to ECR.
2. **Run** the image on ECS Fargate behind an Application Load Balancer.
3. **Point a domain** at the load balancer with HTTPS.

The same image also works on App Runner, EKS, Lightsail, or anywhere that
runs Linux containers — only the orchestration step changes.

---

## 0. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Docker (with buildx) | 24+ | Build the image |
| AWS CLI v2 | latest | Authenticate to ECR + manage ECS |
| An AWS account | — | ECR repo, ECS cluster, ALB, Route 53 hosted zone |
| MongoDB Atlas cluster | — | Already in use; just allow-list the Fargate egress IP / `0.0.0.0/0` |
| OpenAI API key | — | For the chat assistant |

```bash
aws sts get-caller-identity   # confirm you're logged in
docker buildx version         # confirm buildx exists
```

---

## 1. Build & push to ECR

A helper script handles login + repo creation + multi-arch build.

```bash
cd wms
AWS_REGION=us-east-1 \
AWS_ACCOUNT_ID=123456789012 \
./scripts/deploy/push-to-ecr.sh
```

What it does:
- Creates the ECR repo `nventr-wms` if it doesn't exist (image scanning on).
- Logs Docker into `<account>.dkr.ecr.<region>.amazonaws.com`.
- Builds `linux/amd64` (the Fargate default) via `docker buildx`.
- Pushes two tags: the short git SHA *and* `latest`.

Override defaults via env:

```bash
ECR_REPO=nventr-wms-prod \
IMAGE_TAG=v1.0.0 \
PLATFORM=linux/arm64 \      # for Graviton/ARM Fargate, cheaper
./scripts/deploy/push-to-ecr.sh
```

---

## 2. Run on ECS Fargate

### 2a. One-time infrastructure

Create these once (Console or Terraform — your call):

| Resource | Notes |
|---|---|
| **ECS cluster** | Fargate, 1 capacity provider |
| **Task execution role** | `AmazonECSTaskExecutionRolePolicy` + permission to read SSM parameters / Secrets Manager |
| **Task role** | The role the running container assumes (start with no extra perms) |
| **Security group: app** | Inbound `:3000` from the ALB SG only |
| **Security group: ALB** | Inbound `:80` and `:443` from `0.0.0.0/0` |
| **ALB** | Internet-facing, 2 public subnets, target group → port 3000, healthcheck path `/api/health` |
| **CloudWatch log group** | `/ecs/nventr-wms` |

### 2b. Store secrets in AWS Secrets Manager (or SSM Parameter Store)

Never put secrets in the task definition's plaintext `environment`. Create
one secret per sensitive value:

```bash
aws secretsmanager create-secret --name nventr-wms/DATABASE_URL \
  --secret-string 'mongodb+srv://...'
aws secretsmanager create-secret --name nventr-wms/OPENAI_API_KEY \
  --secret-string 'sk-proj-...'
aws secretsmanager create-secret --name nventr-wms/SUPABASE_ANON_KEY \
  --secret-string 'eyJ...'
```

### 2c. Task definition (skeleton)

```json
{
  "family": "nventr-wms",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account>:role/nventr-wms-task",
  "containerDefinitions": [{
    "name": "wms",
    "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/nventr-wms:latest",
    "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
    "essential": true,
    "environment": [
      { "name": "NODE_ENV",                       "value": "production" },
      { "name": "OPENAI_MODEL",                   "value": "gpt-4o-mini" },
      { "name": "OPENAI_EMBEDDING_MODEL",         "value": "text-embedding-3-small" },
      { "name": "NEXT_PUBLIC_SUPABASE_URL",       "value": "https://YOUR_REF.supabase.co" }
    ],
    "secrets": [
      { "name": "DATABASE_URL",                   "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:nventr-wms/DATABASE_URL" },
      { "name": "OPENAI_API_KEY",                 "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:nventr-wms/OPENAI_API_KEY" },
      { "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",  "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:nventr-wms/SUPABASE_ANON_KEY" }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 30
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/nventr-wms",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "wms"
      }
    }
  }]
}
```

### 2d. Service

```bash
aws ecs create-service \
  --cluster <cluster-name> \
  --service-name nventr-wms \
  --task-definition nventr-wms \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-app],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/wms,containerName=wms,containerPort=3000"
```

### 2e. Roll out a new image

After every successful `push-to-ecr.sh`:

```bash
aws ecs update-service \
  --cluster <cluster-name> \
  --service nventr-wms \
  --force-new-deployment
```

---

## 3. Domain + HTTPS

Pick a hostname (e.g. `wms.example.com`).

1. **Request an ACM certificate** in the *same region* as the ALB:
   ```bash
   aws acm request-certificate \
     --domain-name wms.example.com \
     --validation-method DNS
   ```
2. Add the DNS-validation `CNAME` to your DNS provider; wait for `ISSUED`.
3. Add an **HTTPS:443** listener to the ALB and attach the cert; default
   action forwards to the WMS target group.
4. (Optional) Add an **HTTP:80** listener that 301-redirects to HTTPS.
5. Create an **A-record (alias)** in Route 53 (or `CNAME` elsewhere) for
   `wms.example.com` → ALB DNS name.

Visit `https://wms.example.com/api/health` — you should see
`{"status":"ok","db":"ok",...}`.

---

## 4. Local sanity check before deploying

```bash
cd wms
docker build -t nventr-wms:local .
docker run --rm -p 3000:3000 --env-file .env.local nventr-wms:local
# In another shell:
curl -s http://localhost:3000/api/health | jq
```

If health returns `200 ok`, the same image will work on Fargate.

---

## 5. Operational notes

- **Migrations**: run `npx prisma db push` (or `migrate deploy` if you
  switch to migrations) from a one-off ECS task whose container is the
  same image, with command `["npx","prisma","db","push","--accept-data-loss=false"]`.
  Don't run migrations from the running web service.
- **Atlas IP allow-list**: Fargate egress IPs are dynamic. Either use a
  NAT Gateway and allow-list its EIP, or use Atlas Network Peering /
  PrivateLink.
- **Logs**: `aws logs tail /ecs/nventr-wms --since 5m --follow`.
- **Rollback**: re-run `update-service` pinned to a previous SHA tag in
  the task definition.
- **Cost estimate** (us-east-1, 2× 1 vCPU / 2 GB tasks, 1× ALB,
  CloudWatch, ECR): ~ $60–$80 / month before data transfer.
