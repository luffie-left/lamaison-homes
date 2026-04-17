/**
 * GET /api/voice/session (upgraded to WebSocket)
 *
 * ⚠️  DEPLOYMENT NOTE:
 * Vercel serverless functions do NOT support long-lived WebSocket connections.
 * This route is written as a standard Next.js API route for local dev, but for
 * production you MUST deploy the WebSocket server on a persistent Node.js host:
 *   - Railway (recommended — simple, cheap, Node.js native)
 *   - Fly.io
 *   - Render (background worker)
 *   - A small VPS / EC2 instance
 *
 * Workaround for Vercel: use Vercel Edge streaming + server-sent events for
 * one-direction push, and a separate WebSocket relay service (e.g. Ably, Pusher,
 * or Livekit) for bidirectional audio.
 *
 * Protocol — browser → server:
 *   Binary frames: raw audio chunks (WebM/Opus from MediaRecorder)
 *   JSON: { type: 'control', action: 'end' }
 *
 * Protocol — server → browser:
 *   { type: 'ready' }                           ← session started
 *   { type: 'transcript', text, language, final } ← STT result
 *   { type: 'audio', data: string }             ← base64 TTS MP3
 *   { type: 'transfer' }                        ← trigger human transfer
 *   { type: 'ended', summary }                  ← call finished
 *   { type: 'error', message }
 */

// TODO: add to Vercel / Railway env vars
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY as string
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string       // already set
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

import { NextRequest } from 'next/server'
import WebSocket from 'ws'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT, TRANSFER_SIGNAL, detectIntent } from '@/lib/voice/system-prompt'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CallSession {
  id: string
  startedAt: Date
  conversationHistory: ConversationMessage[]
  fullTranscript: string
  languageDetected: string
  transferred: boolean
  transferNumber: string | null
  callerName: string | null
  callerEmail: string | null
  callerPhone: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

async function saveCallLog(session: CallSession) {
  const supabase = createSupabaseClient()
  const endedAt = new Date()
  const duration = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)

  await supabase.from('voice_calls').insert({
    id: session.id,
    started_at: session.startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_seconds: duration,
    language_detected: session.languageDetected || 'en',
    transcript: session.fullTranscript,
    summary: null, // optionally summarise via GPT-4o-mini
    caller_name: session.callerName,
    caller_email: session.callerEmail,
    caller_phone: session.callerPhone,
    intent: detectIntent(session.fullTranscript),
    transferred_to_human: session.transferred,
    transfer_number: session.transferNumber,
    status: session.transferred ? 'transferred' : 'completed',
  })
}

async function generateSummary(
  openai: OpenAI,
  transcript: string,
  language: string
): Promise<string> {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Summarise this voice call in 1-2 sentences. Note the caller intent and outcome. Respond in English regardless of the transcript language.',
      },
      { role: 'user', content: transcript },
    ],
    max_tokens: 120,
    temperature: 0.3,
  })
  return resp.choices[0]?.message?.content ?? ''
}

// ─── Next.js Route Handler ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Next.js App Router does not natively support WebSocket upgrades.
  // When deployed on Railway / Fly.io, use a standalone server.ts file instead.
  // This handler returns instructions for non-WS environments.
  return new Response(
    JSON.stringify({
      error: 'WebSocket upgrade required',
      info: 'Deploy this route on a Node.js server (Railway, Fly.io) — Vercel does not support long-lived WebSockets. See src/server/voice-ws-server.ts for the standalone server.',
    }),
    { status: 426, headers: { 'Content-Type': 'application/json' } }
  )
}

// ─── Standalone WebSocket Handler (for Railway / Fly.io deployment) ────────────
//
// Usage: ts-node src/server/voice-ws-server.ts
// Or add to next.config.ts custom server.
//
// NOTE: Copy this logic into your standalone server file.
// The handler below is exported for reuse in src/server/voice-ws-server.ts.

export async function handleVoiceWebSocket(ws: WebSocket) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const session: CallSession = {
    id: crypto.randomUUID(),
    startedAt: new Date(),
    conversationHistory: [],
    fullTranscript: '',
    languageDetected: 'en',
    transferred: false,
    transferNumber: null,
    callerName: null,
    callerEmail: null,
    callerPhone: null,
  }

  // ── Open Deepgram streaming connection ──────────────────────────────────────
  const dgUrl = [
    'wss://api.deepgram.com/v1/listen',
    '?model=nova-2',
    '&language=multi',     // auto-detect English + Mandarin
    '&punctuate=true',
    '&interim_results=true',
    '&encoding=webm-opus', // MediaRecorder default
    '&sample_rate=48000',
  ].join('')

  const dgWs = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  })

  let dgReady = false
  const audioQueue: Buffer[] = []

  dgWs.on('open', () => {
    dgReady = true
    // Drain any buffered audio
    for (const chunk of audioQueue) dgWs.send(chunk)
    audioQueue.length = 0
    // Let the browser know we're live
    ws.send(JSON.stringify({ type: 'ready' }))
  })

  dgWs.on('error', (err) => {
    console.error('[Deepgram] error:', err.message)
    ws.send(JSON.stringify({ type: 'error', message: 'STT connection failed' }))
  })

  // ── Process Deepgram transcripts ─────────────────────────────────────────
  dgWs.on('message', async (data: WebSocket.RawData) => {
    let result: any
    try {
      result = JSON.parse(data.toString())
    } catch {
      return
    }

    const alt = result?.channel?.alternatives?.[0]
    if (!alt?.transcript) return

    const isFinal: boolean = result.is_final === true
    const text: string = alt.transcript.trim()
    const language: string = result?.channel?.detected_language ?? session.languageDetected

    if (language) session.languageDetected = language

    // Forward transcript to browser (interim + final)
    ws.send(JSON.stringify({ type: 'transcript', text, language, final: isFinal }))

    if (!isFinal || !text) return

    // ── Append to conversation and call GPT-4o ─────────────────────────────
    session.fullTranscript += `\nCaller: ${text}`
    session.conversationHistory.push({ role: 'user', content: text })

    let aiResponse = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...session.conversationHistory,
        ],
        max_tokens: 200,
        temperature: 0.7,
      })
      aiResponse = completion.choices[0]?.message?.content ?? ''
    } catch (err: any) {
      console.error('[GPT-4o] error:', err.message)
      ws.send(JSON.stringify({ type: 'error', message: 'AI response failed' }))
      return
    }

    session.conversationHistory.push({ role: 'assistant', content: aiResponse })
    session.fullTranscript += `\nAI: ${aiResponse}`

    // ── Check for transfer signal ──────────────────────────────────────────
    if (aiResponse.includes(TRANSFER_SIGNAL)) {
      session.transferred = true
      // Strip the signal from the spoken response
      const spokenText = aiResponse.replace(TRANSFER_SIGNAL, '').trim()

      // Speak the transfer announcement first
      if (spokenText) {
        await speakAndSend(openai, ws, spokenText)
      }

      ws.send(JSON.stringify({ type: 'transfer' }))
      await saveCallLog(session)
      return
    }

    // ── Convert AI response to speech and send ─────────────────────────────
    await speakAndSend(openai, ws, aiResponse)
  })

  // ── Receive audio from browser ──────────────────────────────────────────
  ws.on('message', (data: WebSocket.RawData) => {
    if (typeof data === 'string') {
      // Control messages
      try {
        const msg = JSON.parse(data)
        if (msg.type === 'control' && msg.action === 'end') {
          endSession()
        }
      } catch {}
      return
    }
    // Binary audio — forward to Deepgram
    const buf = data as Buffer
    if (dgReady) {
      dgWs.send(buf)
    } else {
      audioQueue.push(buf)
    }
  })

  ws.on('close', () => endSession())
  ws.on('error', (err) => console.error('[BrowserWS] error:', err.message))

  let ended = false
  async function endSession() {
    if (ended) return
    ended = true
    dgWs.close()
    await saveCallLog(session)
    ws.send(JSON.stringify({ type: 'ended', summary: '' }))
  }
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

async function speakAndSend(openai: OpenAI, ws: WebSocket, text: string) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Alloy supports Mandarin Chinese
      input: text,
      response_format: 'mp3',
    })
    const buffer = Buffer.from(await mp3.arrayBuffer())
    const base64 = buffer.toString('base64')
    ws.send(JSON.stringify({ type: 'audio', data: base64 }))
  } catch (err: any) {
    console.error('[TTS] error:', err.message)
    ws.send(JSON.stringify({ type: 'error', message: 'TTS failed' }))
  }
}
