# AI Agent Backend

Backend server for the AI Agent project. Handles REST API and OpenAI Realtime WebSocket Relay.

## Setup

```bash
npm install
```

Create a `.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
API_PORT=8081
RELAY_PORT=8082
MODEL_PROVIDER=openai
MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=1024
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Routes

- `GET /api/context`
- `GET /api/ping`
- WebSocket relay at `/realtime`

## Deployment

Nginx config:

```nginx
server {
  listen 80;
  server_name doc.melisaozdoyuran.ai;

  location /api {
    proxy_pass http://localhost:8081;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }

  location /realtime {
    proxy_pass http://localhost:8082;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
  }
}
```

## Frontend Environment

```env
VITE_BACKEND_URL=https://doc.melisaozdoyuran.ai/api
VITE_LOCAL_RELAY_SERVER_URL=wss://doc.melisaozdoyuran.ai/realtime
```

## Requirements

- Node.js v18+
- `.env` file in project root


## Running the Project

This repository requires external API credentials to run (e.g. LLM / realtime APIs).

For security reasons, no credentials are included.
The project is intended to be reviewed as a **code sample** demonstrating:
- real-time agent orchestration
- document ingestion and vector embedding
- context retrieval
- WebSocket-based interaction

The system will not run without valid credentials, but all core logic
can be reviewed directly in the source.

