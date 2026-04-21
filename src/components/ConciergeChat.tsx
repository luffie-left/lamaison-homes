'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  body: string
  is_from_guest: boolean
  created_at: string
}

interface Listing {
  id: number
  name: string
  city: string
}

export default function ConciergeChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' })
  const [showInfoForm, setShowInfoForm] = useState(true)
  const [showPropertySelect, setShowPropertySelect] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Listing | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch listings when property selection is shown
  useEffect(() => {
    if (showPropertySelect && listings.length === 0) {
      loadListings()
    }
  }, [showPropertySelect])

  async function loadListings() {
    setListingsLoading(true)
    try {
      const res = await fetch('/api/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (err) {
      console.error('Failed to load listings:', err)
    } finally {
      setListingsLoading(false)
    }
  }

  async function handleStartChat(e: React.FormEvent) {
    e.preventDefault()
    if (!guestInfo.name.trim() || !guestInfo.email.trim()) return
    
    setShowInfoForm(false)
    
    // Ask which property they're interested in
    setMessages([{
      id: 'welcome',
      body: `Hi ${guestInfo.name}! Welcome to La Maison Homes. Which property are you interested in?`,
      is_from_guest: false,
      created_at: new Date().toISOString(),
    }])
    
    setShowPropertySelect(true)
  }

  function handlePropertySelect(listing: Listing) {
    setSelectedProperty(listing)
    setShowPropertySelect(false)
    
    setMessages(prev => [...prev, {
      id: `prop-${listing.id}`,
      body: `I'm interested in ${listing.name} (${listing.city})`,
      is_from_guest: true,
      created_at: new Date().toISOString(),
    }])
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 'prop-confirm',
        body: `Great choice! How can I help you with ${listing.name}? You can ask about availability, pricing, or anything else.`,
        is_from_guest: false,
        created_at: new Date().toISOString(),
      }])
    }, 500)
  }

  async function handleSend() {
    if (!input.trim()) return
    
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      body: input.trim(),
      is_from_guest: true,
      created_at: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/general-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
          propertyId: selectedProperty?.id,
          listingName: selectedProperty?.name,
          body: input.trim(),
          isFromGuest: true,
        }),
      })
      
      const data = await res.json()
      
      if (data.threadId && !threadId) {
        setThreadId(data.threadId)
      }
      
      // Auto-reply
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          body: selectedProperty 
            ? `Thank you for your enquiry about ${selectedProperty.name}. Our team will get back to you shortly with availability and pricing. For urgent enquiries, please call us directly.`
            : 'Thank you for your message. Our team will get back to you shortly. For urgent enquiries, please call us directly.',
          is_from_guest: false,
          created_at: new Date().toISOString(),
        }])
      }, 1000)
      
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
          isOpen 
            ? 'bg-gray-800 text-white rotate-0' 
            : 'bg-[#c9a96e] text-white hover:bg-[#b89a60]'
        )}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-[#0d1b2a] text-white px-5 py-4 flex-shrink-0">
            <h3 className="font-semibold text-sm">La Maison Concierge</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedProperty 
                ? `Enquiring about: ${selectedProperty.name}`
                : 'We typically reply within a few minutes'}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {showInfoForm ? (
              <form onSubmit={handleStartChat} className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Please introduce yourself to start chatting:</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={guestInfo.name}
                  onChange={e => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
                  required
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={guestInfo.email}
                  onChange={e => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={guestInfo.phone}
                  onChange={e => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 text-sm font-medium bg-[#c9a96e] text-white rounded-lg hover:bg-[#b89a60] transition-colors"
                >
                  Start Chat
                </button>
              </form>
            ) : showPropertySelect ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Select a property:</p>
                {listingsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : (
                  listings.map(listing => (
                    <button
                      key={listing.id}
                      onClick={() => handlePropertySelect(listing)}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl hover:border-[#c9a96e] hover:bg-amber-50 transition-colors flex items-center gap-3"
                    >
                      <Home size={18} className="text-[#c9a96e] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{listing.name}</p>
                        <p className="text-xs text-gray-500">{listing.city}</p>
                      </div>
                    </button>
                  ))
                )}
                <button
                  onClick={() => {
                    setShowPropertySelect(false)
                    setMessages(prev => [...prev, {
                      id: 'skip-prop',
                      body: "I'm just browsing / general enquiry",
                      is_from_guest: true,
                      created_at: new Date().toISOString(),
                    }])
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Skip — General enquiry
                </button>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.is_from_guest ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.is_from_guest
                        ? 'bg-[#c9a96e] text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    )}>
                      <p className="leading-relaxed">{msg.body}</p>
                      <p className={cn('text-[10px] mt-1', msg.is_from_guest ? 'text-amber-100' : 'text-gray-400')}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!showInfoForm && !showPropertySelect && (
            <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-2 bg-[#c9a96e] text-white rounded-lg hover:bg-[#b89a60] disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
