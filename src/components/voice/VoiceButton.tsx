'use client'

/**
 * VoiceButton — floating AI voice call button for La Maison Homes
 *
 * States: idle → connecting → active → transfer → ended
 * Position: fixed bottom-right
 * Colour: gold #c9a96e (brand)
 *
 * IMPORTANT: Set NEXT_PUBLIC_VOICE_WS_URL in your env to point to your
 * Railway/Fly.io WebSocket server, e.g.:
 *   NEXT_PUBLIC_VOICE_WS_URL=wss://your-voice-server.railway.app/api/voice/session
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// TODO: set NEXT_PUBLIC_VOICE_WS_URL to your Railway/Fly.io server
const WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL ?? 'ws://localhost:3001/api/voice/session'

type CallState = 'idle' | 'connecting' | 'active' | 'transfer' | 'ended'

interface WsMessage {
  type: 'ready' | 'transcript' | 'audio' | 'transfer' | 'ended' | 'error'
  text?: string
  language?: string
  final?: boolean
  data?: string   // base64 MP3
  message?: string
  summary?: string
}

const LANG_FLAG: Record<string, string> = {
  en: '🇦🇺',
  zh: '🇨🇳',
  'zh-CN': '🇨🇳',
  'zh-TW': '🇨🇳',
}

// ─── Waveform bars ────────────────────────────────────────────────────────────

function Waveform({ speaking }: { speaking: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24 }}>
      {[0.6, 1, 0.7, 0.9, 0.5].map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: 'white',
            height: speaking ? `${h * 24}px` : '6px',
            transition: `height ${0.25 + i * 0.07}s ease-in-out`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VoiceButton() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [language, setLanguage] = useState<string>('en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)

  // ── Audio playback queue ──────────────────────────────────────────────────
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    isPlayingRef.current = true
    setIsSpeaking(true)

    const buffer = audioQueueRef.current.shift()!
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current

    try {
      const decoded = await ctx.decodeAudioData(buffer)
      const source = ctx.createBufferSource()
      source.buffer = decoded
      source.connect(ctx.destination)
      source.start()
      source.onended = () => {
        isPlayingRef.current = false
        setIsSpeaking(false)
        playNextAudio()
      }
    } catch {
      isPlayingRef.current = false
      setIsSpeaking(false)
      playNextAudio()
    }
  }, [])

  // ── WebSocket message handler ─────────────────────────────────────────────
  const handleWsMessage = useCallback(
    (evt: MessageEvent) => {
      const msg: WsMessage = JSON.parse(evt.data)

      switch (msg.type) {
        case 'ready':
          setCallState('active')
          break

        case 'transcript':
          if (msg.final && msg.text) {
            setTranscript((prev) => prev + (prev ? '\n' : '') + `You: ${msg.text}`)
          }
          if (msg.language) setLanguage(msg.language)
          break

        case 'audio':
          if (msg.data) {
            // Decode base64 → ArrayBuffer
            const binary = atob(msg.data)
            const ab = new ArrayBuffer(binary.length)
            const view = new Uint8Array(ab)
            for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
            audioQueueRef.current.push(ab)
            playNextAudio()
          }
          break

        case 'transfer':
          setCallState('transfer')
          // Call the Twilio transfer endpoint
          fetch('/api/voice/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callerInfo: { intent: 'voice_transfer' } }),
          }).catch(console.error)
          break

        case 'ended':
          setCallState('ended')
          setTimeout(() => setCallState('idle'), 3000)
          break

        case 'error':
          setErrorMsg(msg.message ?? 'Unknown error')
          break
      }
    },
    [playNextAudio]
  )

  // ── Start call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    setErrorMsg(null)
    setCallState('connecting')

    // Request microphone
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
    } catch {
      setErrorMsg('Microphone access denied')
      setCallState('idle')
      return
    }

    // Connect WebSocket
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // Start MediaRecorder — sends WebM/Opus chunks
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data)
        }
      }
      mr.start(250) // 250ms chunks
    }

    ws.onmessage = handleWsMessage

    ws.onerror = () => {
      setErrorMsg('Connection failed')
      setCallState('idle')
    }

    ws.onclose = () => {
      if (callState === 'active' || callState === 'connecting') {
        setCallState('idle')
      }
    }
  }, [handleWsMessage, callState])

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'control', action: 'end' }))
      ws.close()
    }
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    audioQueueRef.current = []
    setIsSpeaking(false)
    setCallState('idle')
    setTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { endCall() }, [endCall])

  // ── Styles ────────────────────────────────────────────────────────────────
  const GOLD = '#c9a96e'
  const RED = '#e53e3e'

  const isActive = callState === 'active' || callState === 'transfer'
  const buttonBg = callState === 'idle' ? GOLD : isActive ? '#1a1a1a' : GOLD

  return (
    <>
      {/* Transcript toast */}
      {transcript && callState === 'active' && (
        <div
          style={{
            position: 'fixed',
            bottom: 110,
            right: 24,
            maxWidth: 280,
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.5,
            zIndex: 9998,
            backdropFilter: 'blur(8px)',
            whiteSpace: 'pre-wrap',
            maxHeight: 160,
            overflow: 'hidden',
          }}
        >
          {transcript.split('\n').slice(-3).join('\n')}
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 110,
            right: 24,
            background: RED,
            color: '#fff',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            zIndex: 9998,
          }}
          onClick={() => setErrorMsg(null)}
        >
          {errorMsg}
        </div>
      )}

      {/* Transfer overlay */}
      {callState === 'transfer' && (
        <div
          style={{
            position: 'fixed',
            bottom: 110,
            right: 24,
            background: GOLD,
            color: '#fff',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9998,
          }}
        >
          Connecting to our team…
        </div>
      )}

      {/* Main floating button */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Language badge */}
        {callState !== 'idle' && (
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 13,
              color: '#fff',
            }}
          >
            {LANG_FLAG[language] ?? '🌐'} {language?.startsWith('zh') ? '中文' : 'EN'}
          </div>
        )}

        {/* Pulse rings (connecting) */}
        {callState === 'connecting' && (
          <>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 64 + i * 20,
                  height: 64 + i * 20,
                  borderRadius: '50%',
                  background: `${GOLD}${i === 1 ? '40' : '20'}`,
                  animation: `pulse${i} 1.5s ease-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </>
        )}

        {/* Button */}
        <button
          onClick={callState === 'idle' ? startCall : endCall}
          aria-label={callState === 'idle' ? 'Start AI voice call' : 'End call'}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: buttonBg,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            transition: 'background 0.3s, transform 0.15s',
            position: 'relative',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {callState === 'idle' && (
            <PhoneIcon color="white" />
          )}
          {callState === 'connecting' && (
            <SpinnerIcon color="white" />
          )}
          {callState === 'active' && (
            <Waveform speaking={isSpeaking} />
          )}
          {callState === 'transfer' && (
            <PhoneForwardIcon color={GOLD} />
          )}
          {callState === 'ended' && (
            <CheckIcon color="white" />
          )}

          {/* Red end-call button (overlaid when active) */}
          {isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); endCall() }}
              aria-label="End call"
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: RED,
                border: '2px solid white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </button>

        {callState === 'idle' && (
          <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
            AI Concierge
          </span>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse1 {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse2 {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </>
  )
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L7.91 10.17a16 16 0 0 0 5.92 5.92l1.58-1.58a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68a2 2 0 0 1 1.73 2.01z"/>
    </svg>
  )
}

function PhoneForwardIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="19 1 23 5 19 9"/>
      <line x1="15" y1="5" x2="23" y2="5"/>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L7.91 10.17a16 16 0 0 0 5.92 5.92l1.58-1.58a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68a2 2 0 0 1 1.73 2.01z"/>
    </svg>
  )
}

function SpinnerIcon({ color }: { color: string }) {
  return (
    <svg
      width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
