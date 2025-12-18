// relay.js
import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing in .env');
  process.exit(1);
}

const PORT = process.env.RELAY_PORT || 8082;

const log = (...args) => console.log('[Relay]', ...args);

const wss = new WebSocketServer({ port: PORT });
log(`Listening on ws://localhost:${PORT}`);

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/') {
    log(`Invalid path: ${url.pathname}`);
    ws.close();
    return;
  }

  log('New client connection');

  const client = new RealtimeClient({
    apiKey: OPENAI_API_KEY,
    sessionConfig: {
      instructions: 'You are Acme AI.',
    },
  });

  client.realtime.on('server.*', (event) => {
    log(`> to browser: ${event.type}`);
    ws.send(JSON.stringify(event));
  });

  client.realtime.on('close', () => {
    log('OpenAI session closed');
    ws.close();
  });

  const messageQueue = [];
  const handleMessage = (data) => {
    try {
      const event = JSON.parse(data);
      log(`< to OpenAI: ${event.type}`);
      client.realtime.send(event.type, event);
    } catch (err) {
      log('Error parsing message:', data);
    }
  };

  ws.on('message', (data) => {
    if (!client.isConnected()) {
      messageQueue.push(data);
    } else {
      handleMessage(data);
    }
  });

  ws.on('close', () => {
    log('Browser connection closed');
    client.disconnect();
  });

  try {
    await client.connect();
    log('✅ Connected to OpenAI');
    while (messageQueue.length > 0) {
      handleMessage(messageQueue.shift());
    }
  } catch (err) {
    log('❌ Failed to connect to OpenAI:', err.message);
    ws.close();
  }
});
