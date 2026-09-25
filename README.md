# Jarvis Voice AI Assistant

A real-time, multimodal voice AI butler built with **LiveKit Agents**, **Google Gemini Live**, **Playwright Browser Automation**, and modern client frontends (**Next.js** web and **Flutter** mobile).

## Project Overview

- **Realtime Multimodal AI**: Bidirectional voice conversation and vision awareness powered by Google's Gemini Live API.
- **Personality**: Impeccably composed, witty AI butler inspired by Jarvis.
- **Tool Capabilities**: Real-time web search (DuckDuckGo) and full browser automation (Playwright Chrome controller).
- **Multi-Platform**: Connect via LiveKit hosted playground, Next.js Web UI, or Flutter mobile app.

## Project Structure

```
Jarvis/
├── source/
│   ├── __init__.py
│   ├── agent.py            # Main entry point & session runner
│   ├── tools.py            # DuckDuckGo search function tool
│   └── browser.py          # Playwright browser automation tools
├── frontend/               # Next.js Agents UI web client
├── mobile/                 # Flutter iOS/Android mobile client
├── Prompt.txt              # Jarvis persona & instructions
├── Blueprint.txt           # Build reference guide
├── opencode.json           # LiveKit documentation MCP server config
├── pyproject.toml          # Python package & dependency configuration
└── .env.local              # Local credentials & secrets
```

## Quick Start

### 1. Configure Environment Variables
Copy `.env.local.example` to `.env.local` and add your keys:
```env
GOOGLE_API_KEY=your_gemini_api_key
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

### 2. Install Dependencies
```bash
uv sync
uv run playwright install chromium
```

### 3. Run the Agent
- **Console Mode (Terminal testing)**:
  ```bash
  uv run source/agent.py console
  ```
- **Dev Mode (LiveKit Hosted Playground)**:
  ```bash
  uv run source/agent.py dev
  ```
