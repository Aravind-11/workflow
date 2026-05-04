# nventr-wms infrastructure

Everything needed to clone this repo and (re)deploy the WMS stack on AWS.

## Topology

```
        users
          │ HTTPS
          ▼
   ┌────────────────┐
   │   Cloudflare   │   wms.nventrdemo.ai → tunnel
   │     Tunnel     │
   └───────┬────────┘
           │
           ▼
   ┌──────────────────────────────────────────────────┐
   │ AWS account 788658419055 · us-east-1             │
   │                                                  │
   │  ECS Fargate cluster: NventrAgentCPU             │
   │   └─ service: nventr-wms                         │
   │       ├─ container: wms (Next.js, port 3000)     │
   │       │   image: nventr-wms:latest (ECR)         │
   │       └─ sidecar: cloudflared (tunnel)           │
   │                                                  │
   │  EC2 g4dn.xlarge "ollama-host"                   │
   │   private IP 172.31.45.113, port 11434           │
   │   model: llama3.1:8b-instruct-q4_K_M             │
   │   reachable from ECS task SG via SG rule         │
   │                                                  │
   │  ECR repo: nventr-wms (built by GH Actions)      │
   │  CloudWatch: /ecs/nventr-wms, /ecs/nventr-wms-   │
   │              cloudflared, /ecs/ollama-host       │
   └──────────────────────────────────────────────────┘

   External:
     - MongoDB Atlas (cluster: cobots-dev, db: wms)
     - Supabase (auth + session)
```

## Repo layout

| Path | What's there |
|---|---|
| `wms/` | Next.js app, Dockerfile, Prisma schema. Built by CI. |
| `.github/workflows/wms-build-push.yml` | Builds the wms image and pushes to ECR `:latest` and `:<sha>` on every push to `main` or `feat/task-visualizer` that touches `wms/**`. |
| `infra/wms-taskdef.template.json` | ECS task def template. Placeholders for every secret. **Do not commit a rendered version.** |
| `infra/flip-tunnel.sh` | One-shot script: render the Cloudflare tunnel token into the template, register a new task-def revision, redeploy the service, tail tunnel logs. |
| `infra/ollama-bootstrap.sh` | EC2 user-data for the GPU box that hosts Ollama. Installs the daemon, binds to all interfaces, pulls the model. |

## Required GitHub Actions secrets

These are already set on the repo (`gh secret list -R Aravind-11/workflow`):

| Secret | Used by | Purpose |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `wms-build-push.yml` | Push image to ECR. |
| `AWS_SECRET_ACCESS_KEY` | `wms-build-push.yml` | Push image to ECR. |
| `NEXT_PUBLIC_SUPABASE_URL` | docker `--build-arg` | Baked into the Next.js client bundle. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | docker `--build-arg` | Baked into the Next.js client bundle. |

## Required ECS task-def env vars (runtime)

These live in the ECS task definition, **not** in the docker image. Substitute placeholders in `wms-taskdef.template.json` before registering:

| Var | Where the value comes from | Notes |
|---|---|---|
| `DATABASE_URL` | MongoDB Atlas connection string | Includes the user/password. **Rotate periodically.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public-safe but kept here so prod ≠ build-time value. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT | Public-safe by Supabase design. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `openssl rand -base64 32` | Required by Next.js 16 server actions; bumping it invalidates in-flight server-action ids, so prefer to keep stable. |
| `OLLAMA_BASE_URL` | `http://<ollama-private-ip>:11434/v1` | The Ollama EC2's private IP. Survives stop/start. |
| `OLLAMA_MODEL` | e.g. `llama3.1:8b-instruct-q4_K_M` | Must already be `ollama pull`'d on the box. |
| `TUNNEL_TOKEN` | `cloudflared` sidecar env | Provided by the Cloudflare Tunnel owner. |

In the long run we should move the secret values to **AWS Secrets Manager** and switch the env list to `secrets:` + `valueFrom:`. For now they're inline.

## How a code change reaches production

```
git push                              → GH push event
  ↓                                     (branches: main, feat/task-visualizer)
GH Actions: wms · build & push to ECR → builds linux/amd64, pushes to ECR
  ↓                                     :latest and :<sha>
aws ecs update-service                → ECS pulls :latest, starts new task
  --force-new-deployment                old task drains, new one passes health
```

Manual redeploy (no code change, just kick the service):

```bash
aws ecs update-service \
  --profile wms --region us-east-1 \
  --cluster NventrAgentCPU --service nventr-wms \
  --force-new-deployment
```

Manually trigger a build on a branch the CI doesn't auto-run (e.g. a feature branch):

```bash
gh workflow run "wms · build & push to ECR" \
  --ref <branch> -R Aravind-11/workflow
```

## How to spin up Ollama (the LLM box)

1. Create a security group `ollama-sg` in `vpc-09435bc63426a1914`. Inbound: `tcp/11434` from the ECS task SG (`sg-02ea1be19ff041a32`). No public ingress.
2. Launch a `g4dn.xlarge` from the latest **Deep Learning Base GPU AMI (Ubuntu 22.04)** in `subnet-054da3173ae1eeb8e`, attach `ollama-sg`, 100 GiB gp3 root volume.
3. Pass `infra/ollama-bootstrap.sh` as **user-data**. It will install the Ollama daemon, bind it to `0.0.0.0:11434`, and pull `llama3.1:8b-instruct-q4_K_M`.
4. Note the instance's **private IP** — set `OLLAMA_BASE_URL=http://<that-ip>:11434/v1` in the ECS task def. Private IP survives stop/start.

Cost: ~$0.526/hr on-demand, ~$380/mo at 24/7. Stop when not in use:

```bash
aws ec2 --profile wms stop-instances  --instance-ids <id>
aws ec2 --profile wms start-instances --instance-ids <id>
```

## How to flip a Cloudflare tunnel token

Once you have the tunnel token from your Cloudflare admin:

```bash
# Standard AWS CLI auth (use a profile, never put keys in the shell history)
export AWS_PROFILE=wms
export AWS_REGION=us-east-1

# Render placeholders → register task-def revision → redeploy → tail logs
./infra/flip-tunnel.sh '<paste-cf-tunnel-token-here>'
```

After it stabilizes you should see `Registered tunnel connection` lines in `/ecs/nventr-wms-cloudflared`.

## Who/what already exists in AWS (state)

| Resource | ID / name |
|---|---|
| Account | 788658419055 |
| Region | us-east-1 |
| VPC | vpc-09435bc63426a1914 |
| Subnet (ECS + Ollama) | subnet-054da3173ae1eeb8e (us-east-1d) |
| ECS cluster | NventrAgentCPU |
| ECS service | nventr-wms |
| ECS task SG | sg-02ea1be19ff041a32 (`nventr-ecs-sg`) |
| Ollama SG | sg-0797e143f1d11a2d8 (`ollama-sg`) |
| Ollama EC2 | i-080e75fa374f9e72f, private IP 172.31.45.113 |
| ECR repo | nventr-wms |
| Domain | wms.nventrdemo.ai (via Cloudflare tunnel) |

## What's deliberately NOT in this repo

- **`.env.local`** — local-only, should never be committed. See `wms/.env.example` for the shape.
- **Rendered task definitions** — anything with real secrets in it stays in your shell, not in git.
- **`mailroom-analytics/`** — auxiliary research/data assets, not part of the app.
