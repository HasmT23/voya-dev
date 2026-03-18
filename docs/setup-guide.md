# Voya — Complete Setup Guide

Everything you need to do manually to get Voya running.

---

## Table of Contents

1. [Prerequisites (Install These First)](#1-prerequisites)
2. [Google OAuth Setup](#2-google-oauth-setup)
3. [Anthropic (Claude) API Key](#3-anthropic-claude-api-key)
4. [Stripe Setup](#4-stripe-setup)
5. [AWS Setup](#5-aws-setup)
6. [Docker Setup](#6-docker-setup)
7. [Environment Variables](#7-environment-variables)
8. [Run Locally](#8-run-locally)
9. [Mobile App Setup](#9-mobile-app-setup)
10. [Desktop Agent Setup](#10-desktop-agent-setup)
11. [Deploy to AWS EKS](#11-deploy-to-aws-eks)

---

## 1. Prerequisites

Install these on your machine before anything else:

### macOS

```bash
# Install Homebrew (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 22
brew install node@22

# Install Docker Desktop
brew install --cask docker

# Install AWS CLI
brew install awscli

# Install kubectl (Kubernetes CLI)
brew install kubectl

# Install Helm
brew install helm

# Install Expo CLI (for mobile app)
npm install -g expo-cli

# Verify everything installed
node --version    # Should be v22.x
docker --version  # Should show Docker version
aws --version     # Should show aws-cli
kubectl version --client
helm version
```

---

## 2. Google OAuth Setup

This lets users sign in with their Google account.

### Step-by-step:

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/

2. **Create a new project**
   - Click the project dropdown at the top → "New Project"
   - Name it `Voya`
   - Click "Create"

3. **Enable the required APIs**
   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - `Google Identity Services` (or `Google Sign-In`)
     - `People API`

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" → Create
   - Fill in:
     - App name: `Voya`
     - User support email: your email
     - Developer contact: your email
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your own email
   - Click "Save and Continue" through all steps

5. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - For the **backend** (API service):
     - Application type: "Web application"
     - Name: `Voya Backend`
     - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
     - Click "Create"
     - **Save the Client ID and Client Secret** — you'll need these
   - For the **mobile app**:
     - Application type: "iOS" (for Expo/React Native)
     - Name: `Voya Mobile`
     - Bundle ID: `dev.voya.app` (or whatever you want)
     - Click "Create"
     - **Save the Client ID**

6. **What you'll have after this step:**
   ```
   GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
   ```

---

## 3. Anthropic (Claude) API Key

This powers the AI action planning.

### Step-by-step:

1. **Go to Anthropic Console**
   - https://console.anthropic.com/

2. **Sign in** (or create an account if you don't have one)

3. **Go to "API Keys"**
   - Click "Create Key"
   - Name it `Voya`
   - Copy the key immediately — it's only shown once

4. **Add billing**
   - Go to "Plans & Billing"
   - Add a payment method
   - The default rate limits should be fine to start

5. **What you'll have after this step:**
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
   ```

---

## 4. Stripe Setup

This handles Pro tier subscriptions.

### Step-by-step:

1. **Go to Stripe Dashboard**
   - https://dashboard.stripe.com/

2. **Create an account** (or sign in)

3. **Stay in Test Mode** (toggle at the top — keep it orange/test for now)

4. **Get your API keys**
   - Go to "Developers" → "API keys"
   - Copy the **Secret key** (starts with `sk_test_`)
   - Copy the **Publishable key** (starts with `pk_test_`) — for mobile app later

5. **Create a Pro subscription product**
   - Go to "Products" → "Add Product"
   - Name: `Voya Pro`
   - Pricing: $10/month, Recurring
   - Click "Save product"
   - Click into the product → find the **Price ID** (starts with `price_`)
   - Copy this Price ID

6. **Set up the webhook**
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Endpoint URL: `https://api.voya.dev/billing/webhook` (for production)
     - For local testing: use Stripe CLI (see below)
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
   - Click "Add endpoint"
   - Copy the **Webhook signing secret** (starts with `whsec_`)

7. **Install Stripe CLI for local testing**
   ```bash
   brew install stripe/stripe-cli/stripe

   # Login to Stripe
   stripe login

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/billing/webhook
   # This will print a webhook signing secret — use this for local dev
   ```

8. **What you'll have after this step:**
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxx
   ```

---

## 5. AWS Setup

### 5a. AWS Account & CLI

1. **Sign into AWS Console**
   - https://console.aws.amazon.com/

2. **Create an IAM user for CLI access**
   - Go to IAM → Users → "Create user"
   - Username: `voya-admin`
   - Attach policies: `AdministratorAccess` (for initial setup — restrict later)
   - Go to "Security credentials" tab → "Create access key"
   - Choose "CLI" → Create
   - **Save the Access Key ID and Secret Access Key**

3. **Configure AWS CLI locally**
   ```bash
   aws configure
   # Enter:
   #   AWS Access Key ID: your key
   #   AWS Secret Access Key: your secret
   #   Default region: us-east-1 (or your preferred region)
   #   Default output format: json
   ```

### 5b. AWS RDS (PostgreSQL Database)

1. **Go to RDS in AWS Console**
   - https://console.aws.amazon.com/rds/

2. **Create a database**
   - Click "Create database"
   - Engine: PostgreSQL
   - Template: "Free tier" (for development)
   - Settings:
     - DB instance identifier: `voya-db`
     - Master username: `voya`
     - Master password: (create a strong password, save it)
   - Connectivity:
     - VPC: Default VPC
     - Public access: Yes (for development — disable in production)
   - Click "Create database"

3. **Get the endpoint**
   - After creation, click into the database
   - Copy the **Endpoint** (e.g., `voya-db.xxxx.us-east-1.rds.amazonaws.com`)

4. **What you'll have after this step:**
   ```
   DATABASE_URL=postgresql://voya:YOUR_PASSWORD@voya-db.xxxx.us-east-1.rds.amazonaws.com:5432/voya
   ```

### 5c. AWS EKS (Kubernetes Cluster) — For Production Deployment

Skip this for local development. Only needed when deploying to production.

1. **Create the EKS cluster**
   ```bash
   # Install eksctl
   brew install eksctl

   # Create cluster (takes ~15-20 minutes)
   eksctl create cluster \
     --name voya-cluster \
     --region us-east-1 \
     --nodegroup-name voya-nodes \
     --node-type t3.medium \
     --nodes 2 \
     --nodes-min 1 \
     --nodes-max 4
   ```

2. **Verify cluster**
   ```bash
   kubectl get nodes
   # Should show 2 nodes in Ready state
   ```

3. **Install NGINX Ingress Controller**
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm install ingress-nginx ingress-nginx/ingress-nginx
   ```

4. **Deploy Voya**
   ```bash
   # From the repo root
   helm install voya ./helm/voya \
     --set secrets.jwtSecret="YOUR_JWT_SECRET" \
     --set secrets.anthropicApiKey="YOUR_KEY" \
     --set secrets.googleClientId="YOUR_ID" \
     --set secrets.googleClientSecret="YOUR_SECRET" \
     --set secrets.stripeSecretKey="YOUR_KEY" \
     --set secrets.stripeWebhookSecret="YOUR_SECRET" \
     --set image.registry="YOUR_ECR_REGISTRY"
   ```

---

## 6. Docker Setup

### Install Docker Desktop

1. **Download and install**
   - macOS: `brew install --cask docker`
   - Windows: Download from https://www.docker.com/products/docker-desktop/
   - Open Docker Desktop and let it start

2. **Verify it works**
   ```bash
   docker --version
   docker compose version
   ```

---

## 7. Environment Variables

Create a `.env` file in the repo root (it's gitignored, so it won't be committed):

```bash
cd ~/Projects/voya-dev
cp .env.example .env
```

Fill in ALL values in `.env`:

```env
# Claude API (from Step 3)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# Google OAuth (from Step 2)
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# AWS (from Step 5a)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA-xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx

# Stripe (from Step 4)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxx

# App secrets (generate these yourself)
JWT_SECRET=run-this-command: openssl rand -hex 32
DEVICE_TOKEN_SECRET=run-this-command: openssl rand -hex 32
PORT=3000
```

**Generate your JWT and device token secrets:**
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "DEVICE_TOKEN_SECRET=$(openssl rand -hex 32)"
```

---

## 8. Run Locally

### Option A: Docker Compose (recommended — runs everything)

```bash
cd ~/Projects/voya-dev

# Start all backend services + PostgreSQL
docker compose up --build

# Services will be at:
#   API Service:      http://localhost:3000
#   Registry Service: http://localhost:3001
#   WebSocket Service: http://localhost:3002
#   Agent Service:    http://localhost:3003
#   PostgreSQL:       localhost:5432
```

### Option B: Run services individually (for development)

```bash
# Terminal 1: Start PostgreSQL only
docker compose up postgres

# Terminal 2: Registry service
cd backend/registry-service
npm install
npx prisma generate
npx prisma db push
npm run dev

# Terminal 3: API service
cd backend/api-service
npm install
npx prisma generate
npx prisma db push
npm run dev

# Terminal 4: WebSocket service
cd backend/ws-service
npm install
npm run dev

# Terminal 5: Agent service
cd backend/agent-service
npm install
npm run dev
```

### Run database migrations
```bash
# From registry-service or api-service directory
npx prisma migrate dev --name init
```

---

## 9. Mobile App Setup

```bash
cd ~/Projects/voya-dev/mobile

# Install dependencies
npm install

# Install Expo Go on your iPhone
# Download from App Store: "Expo Go"

# Start the dev server
npx expo start

# Scan the QR code with your iPhone camera
# The app will open in Expo Go
```

### Configure mobile environment
Create `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
EXPO_PUBLIC_WS_URL=ws://YOUR_LOCAL_IP:3002
```

Find your local IP:
```bash
ipconfig getifaddr en0
# Use this IP instead of localhost so your phone can reach your computer
```

---

## 10. Desktop Agent Setup

```bash
cd ~/Projects/voya-dev/desktop-agent

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Set environment variables
export VOYA_WS_URL=ws://localhost:3002
export VOYA_DEVICE_TOKEN=your-device-token-from-pairing

# Run the agent
npm run dev
```

Note: You need to complete the pairing flow first (via the mobile app) to get a device token.

---

## 11. Deploy to AWS EKS

See Section 5c above for EKS cluster creation.

### Build and push Docker images

```bash
# Create ECR repositories
aws ecr create-repository --repository-name voya-api-service
aws ecr create-repository --repository-name voya-registry-service
aws ecr create-repository --repository-name voya-ws-service
aws ecr create-repository --repository-name voya-agent-service

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service
for service in api-service registry-service ws-service agent-service; do
  docker build -t voya-$service backend/$service/
  docker tag voya-$service:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/voya-$service:latest
  docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/voya-$service:latest
done
```

### Deploy with Helm

```bash
helm install voya ./helm/voya \
  --set image.registry="YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com" \
  --set secrets.jwtSecret="$(openssl rand -hex 32)" \
  --set secrets.anthropicApiKey="sk-ant-xxx" \
  --set secrets.googleClientId="xxx.apps.googleusercontent.com" \
  --set secrets.googleClientSecret="GOCSPX-xxx" \
  --set secrets.stripeSecretKey="sk_test_xxx" \
  --set secrets.stripeWebhookSecret="whsec_xxx"
```

---

## Quick Reference — Order of Operations

1. Install prerequisites (Node, Docker, AWS CLI, etc.)
2. Set up Google OAuth (get Client ID + Secret)
3. Get Anthropic API key
4. Set up Stripe (test mode) — get keys + create Pro product
5. Create `.env` file with all keys
6. `docker compose up --build` to start everything
7. Install Expo Go on iPhone
8. `cd mobile && npm install && npx expo start`
9. Pair your desktop via QR code
10. Start speaking commands

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker won't start | Make sure Docker Desktop is running |
| Port already in use | `lsof -i :3000` then `kill -9 PID` |
| Prisma errors | Run `npx prisma generate` then `npx prisma db push` |
| Mobile can't connect | Use your local IP, not localhost. Check firewall |
| Google auth fails | Check redirect URIs match exactly |
| Stripe webhook fails | Run `stripe listen --forward-to localhost:3000/billing/webhook` |
