/**
 * Standalone WebSocket server for the La Maison Homes AI voice assistant.
 *
 * Deploy this on Railway, Fly.io, or any persistent Node.js host.
 * This is NOT a Vercel function — Vercel cannot run long-lived WebSockets.
 *
 * Railway deployment:
 *   1. Create a new Railway service pointing to this repo
 *   2. Set start command: npx ts-node src/server/voice-ws-server.ts
 *   3. Expose port 3001 (or set PORT env var)
 *   4. Add all env vars listed below
 *   5. Update NEXT_PUBLIC_VOICE_WS_URL in your Vercel env to point here
 *
 * Environment variables required:
 *   DEEPGRAM_API_KEY        — from console.deepgram.com
 *   OPENAI_API_KEY          — already set
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PORT                    — defaults to 3001
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { handleVoiceWebSocket } from '@/app/api/voice/session/route'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer, path: '/api/voice/session' })

wss.on('connection', (ws, req) => {
  console.log('[VoiceWS] new connection from', req.socket.remoteAddress)
  handleVoiceWebSocket(ws)
})

httpServer.listen(PORT, () => {
  console.log(`[VoiceWS] server listening on ws://0.0.0.0:${PORT}/api/voice/session`)
})
