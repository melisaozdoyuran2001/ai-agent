// server.ts
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { RealtimeClient } from 'openai-realtime-api';
import { contextHandler } from './contextHandler';

dotenv.config();

const API_PORT = process.env.API_PORT || 8081;
const RELAY_PORT = parseInt(process.env.RELAY_PORT || '8082');

async function main() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  app.get('/api/ping', (_, res) => {
    res.send('pong');
  });

  app.get('/api/context', contextHandler);

  app.get("/api/status", async (_, res) => {
    res.send({
      relayConnected: true,
    });
  });

  server.listen(API_PORT, () => {
    console.log(`🚀 Backend API running at http://localhost:${API_PORT}`);
  });

  // ---- Custom WebSocket Relay ----

  const wss = new WebSocketServer({ port: RELAY_PORT });
  console.log(`[Relay] Listening on ws://localhost:${RELAY_PORT}`);

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname !== '/' && url.pathname !== '/realtime') {
      console.log(`[Relay] Invalid path: ${url.pathname}`);
      ws.close();
      return;
    }

    console.log('[Relay] New client connection');

    const client = new RealtimeClient({
      apiKey: process.env.OPENAI_API_KEY,
      sessionConfig: {
        instructions: 'You are Acme Bank AI.',
      },
    });

    client.realtime.on('server.*', (event) => {
      // console.log(`[Relay] > to browser: ${event.type}`);
      ws.send(JSON.stringify(event));
    });

    client.realtime.on('close', () => {
      console.log('[Relay] OpenAI session closed');
      ws.close();
    });

    const messageQueue: string[] = [];
    const handleMessage = (data: string) => {
      try {
        const event = JSON.parse(data);
        // console.log(`[Relay] < to OpenAI: ${event.type}`);
        client.realtime.send(event.type, event);
      } catch (err) {
        console.log('[Relay] Error parsing message:', data);
      }
    };
    ws.on('message', (data) => {
      if (!client.isConnected) {
        messageQueue.push(data.toString());
      } else {
        handleMessage(data.toString());
      }
    });
    

    ws.on('close', () => {
      console.log('[Relay] Browser connection closed');
      client.disconnect();
    });

    try {
      await client.connect();
      console.log('[Relay] ✅ Connected to OpenAI');
      while (messageQueue.length > 0) {
        handleMessage(messageQueue.shift()!);
      }
    } catch (err: any) {
      console.log('[Relay] ❌ Failed to connect to OpenAI:', err.message);
      ws.close();
    }
  });
}

main();