# Voya

> Voice-controlled remote automation. Speak a command on your phone — Voya executes it on your desktop.

## What is Voya?

Voya lets you control your desktop browser from your iPhone using natural language voice commands. Say "save this YouTube video to my Watch Later playlist" and Voya finds it, opens it, and saves it — all while you're across the room or across the country.

## Features

- 🎙️ Voice input via iPhone (iOS STT)
- 🔗 Chained multi-step browser automation
- 🌐 Works remotely over any network
- 🖥️ Supports Windows & Mac desktops
- 🔒 Secure device pairing via encrypted token
- 🧠 Powered by Claude AI for intent parsing
- 📦 Self-hostable via Helm + Kubernetes

## Supported Platforms

- Google
- YouTube
- Notion

## Architecture

```
iPhone (React Native)
  └─ Voice → iOS STT → Intent → HTTPS → AWS Backend

AWS EKS Backend
  ├─ API Service        (auth, routing)
  ├─ WebSocket Service  (phone ↔ desktop bridge)
  ├─ Agent Service      (Claude AI, action planning)
  └─ Registry Service   (device pairing, tokens)

Desktop Agent (Node.js — Windows/Mac)
  └─ WebSocket → Playwright → Browser Automation
```

## Pricing

| Tier | Limit | Price |
|------|-------|-------|
| Free | 20 commands/month | $0 |
| Pro | Unlimited | ~$10/month |
| Self-host | Unlimited | Free |

## Getting Started

Coming soon.

## Self-Hosting

Coming soon.

## Contributing

Coming soon.

## License

MIT
