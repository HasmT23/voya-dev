# Voya — Architecture

## System Overview

```
iPhone (React Native)
  └─ Voice → iOS STT → Intent → HTTPS → AWS Backend

AWS EKS Backend
  ├─ API Service        (auth, routing, usage tracking)
  ├─ WebSocket Service  (persistent phone ↔ desktop bridge)
  ├─ Agent Service      (Claude AI, chained action planning)
  └─ Registry Service   (device pairing, secure tokens)

Desktop Agent (Node.js — Windows/Mac)
  └─ WSS → Playwright → Browser Automation
```

## Data Flow — Example Command

1. User speaks: "Save this YouTube video to my Watch Later playlist"
2. iOS STT converts speech to text
3. React Native sends intent to API Service over HTTPS
4. Agent Service (Claude) parses intent → generates step plan:
   - Step 1: Navigate to YouTube
   - Step 2: Search for video
   - Step 3: Open video
   - Step 4: Add to playlist (create if missing)
5. WebSocket Service forwards plan to Desktop Agent
6. Desktop Agent executes steps via Playwright
7. Status reported back → iPhone notified

## Services

### API Service
- REST API
- Google OAuth 2.0
- Usage tracking (free tier limits)
- Stripe billing

### WebSocket Service
- Persistent connections from Desktop Agents
- Routes action plans to correct desktop
- Handles reconnection and heartbeats

### Agent Service
- Claude API integration
- Natural language → action plan
- Chained step generation
- Error recovery and replanning

### Registry Service
- Device pairing via QR code
- Encrypted token generation and storage
- Token rotation and expiry

## Security

- All communication over HTTPS/WSS
- Device tokens: 256-bit, cryptographically random
- Tokens exchanged via QR code (never in URLs)
- Tokens encrypted at rest
- Google OAuth for user identity
- JWT for session management

## Deployment

- Docker containers per service
- Helm charts for Kubernetes
- AWS EKS cluster
- Self-hostable — bring your own API keys

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native, Expo, NativeWind, Reanimated |
| Backend | Node.js, TypeScript |
| AI | Claude API (Anthropic) |
| Browser Automation | Playwright |
| Database | TBD |
| Auth | Google OAuth 2.0 |
| Billing | Stripe |
| Deployment | Docker, Helm, AWS EKS |
| Visual Assets | Nano Banana |
