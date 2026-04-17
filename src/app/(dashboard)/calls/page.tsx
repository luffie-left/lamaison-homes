'use client'

/**
 * /calls — Admin call log dashboard
 *
 * Shows all AI voice calls from the voice_calls Supabase table.
 * Filters: language, intent, date range
 * Click row → full transcript modal
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceCall {
  id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  language_detected: string | null
  transcript: string | null
  summary: string | null
  caller_name: string | null
  caller_email: string | null
  caller_phone: string | null
  intent: string | null
  transferred_to_human: boolean
  transfer_number: string | null
  status: string
  created_at: string
}

interface CallsResponse {
  calls: VoiceCall[]
  total: number
  page: number
  pages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_LABEL: Record<string, string> = {
  en: '🇦🇺 English',
  zh: '🇨🇳 Mandarin',
  'zh-CN': '🇨🇳 Mandarin',
}

const INTENT_LABEL: Record<string, string> = {
  owner_enquiry: 'Owner Enquiry',
  guest_support: 'Guest Support',
  booking: 'Booking',
  other: 'Other',
}

const STATUS_COLOR: Record<string, string> = {
  completed: '#22c55e',
  transferred: '#c9a96e',
  active: '#3b82f6',
  missed: '#ef4444',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Transcript Modal ─────────────────────────────────────────────────────────

function TranscriptModal({ call, onClose }: { call: VoiceCall; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          maxWidth: 640,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Call Transcript</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
              {formatDate(call.started_at)} · {formatDuration(call.duration_seconds)} · {LANG_LABEL[call.language_detected ?? ''] ?? call.language_detected}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#999', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {call.summary && (
          <div style={{ background: '#f9f5ef', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <strong style={{ fontSize: 12, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: 1 }}>Summary</strong>
            <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6 }}>{call.summary}</p>
          </div>
        )}

        {call.caller_name || call.caller_email || call.caller_phone ? (
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
            <strong style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Caller</strong>
            <div style={{ marginTop: 6, lineHeight: 1.8 }}>
              {call.caller_name && <div>👤 {call.caller_name}</div>}
              {call.caller_email && <div>✉️ {call.caller_email}</div>}
              {call.caller_phone && <div>📞 {call.caller_phone}</div>}
            </div>
          </div>
        ) : null}

        <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
          {call.transcript ?? 'No transcript recorded.'}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null)

  // Filters
  const [language, setLanguage] = useState('')
  const [intent, setIntent] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (language) params.set('language', language)
    if (intent) params.set('intent', intent)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)

    try {
      const resp = await fetch(`/api/voice/calls?${params}`)
      const data: CallsResponse = await resp.json()
      setCalls(data.calls ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, language, intent, fromDate, toDate])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  const GOLD = '#c9a96e'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Voice Calls</h1>
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>
          AI concierge call log — {total} total calls
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <select
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">All Languages</option>
          <option value="en">🇦🇺 English</option>
          <option value="zh">🇨🇳 Mandarin</option>
        </select>

        <select
          value={intent}
          onChange={(e) => { setIntent(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">All Intents</option>
          <option value="owner_enquiry">Owner Enquiry</option>
          <option value="guest_support">Guest Support</option>
          <option value="booking">Booking</option>
          <option value="other">Other</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          style={selectStyle}
          placeholder="From"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          style={selectStyle}
          placeholder="To"
        />

        {(language || intent || fromDate || toDate) && (
          <button
            onClick={() => { setLanguage(''); setIntent(''); setFromDate(''); setToDate(''); setPage(1) }}
            style={{ ...selectStyle, background: '#fee2e2', color: '#dc2626', cursor: 'pointer', border: 'none' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Loading calls…</div>
      ) : calls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          No calls found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Date', 'Duration', 'Language', 'Intent', 'Summary', 'Transferred', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderBottom: '2px solid #eee',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f5ef')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={tdStyle}>{formatDate(call.started_at)}</td>
                  <td style={tdStyle}>{formatDuration(call.duration_seconds)}</td>
                  <td style={tdStyle}>{LANG_LABEL[call.language_detected ?? ''] ?? call.language_detected ?? '—'}</td>
                  <td style={tdStyle}>{INTENT_LABEL[call.intent ?? ''] ?? call.intent ?? '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>
                    {call.summary ?? <span style={{ color: '#bbb' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {call.transferred_to_human ? (
                      <span style={{ color: GOLD, fontWeight: 600 }}>Yes</span>
                    ) : (
                      <span style={{ color: '#ccc' }}>No</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: `${STATUS_COLOR[call.status] ?? '#999'}22`,
                        color: STATUS_COLOR[call.status] ?? '#999',
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {call.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ ...pageBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ padding: '8px 12px', fontSize: 13, color: '#666' }}>
            Page {page} of {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            style={{ ...pageBtn, opacity: page === pages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Transcript modal */}
      {selectedCall && (
        <TranscriptModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  background: '#fff',
  color: '#333',
  outline: 'none',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
}

const pageBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
}
