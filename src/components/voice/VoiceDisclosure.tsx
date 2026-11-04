/**
 * LMH-009 — AI voice concierge disclosure.
 *
 * Ready-made disclosure that must render adjacent to the voice widget when
 * it is re-enabled post-relaunch (see layout.tsx comment). The widget is
 * currently disabled site-wide, so this component is dormant — import it
 * alongside <VoiceButton /> when that returns.
 *
 * Legal context: Australian Privacy Act expectations + AI transparency —
 * guests must know (a) they are talking to an AI, (b) voice data is
 * processed/transcribed (Deepgram), (c) how to reach a human.
 *
 * TODO(owner sign-off): confirm retention period wording with Mick and
 * link the final /privacy-policy voice-data section before enabling.
 */
"use client";

import { useState } from "react";

export function VoiceDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed bottom-2 right-6 z-[10000] max-w-[260px]"
      role="note"
      aria-label="AI concierge disclosure"
    >
      {open ? (
        <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-[11px] leading-snug text-stone-600 shadow-lg backdrop-blur">
          <p className="font-semibold text-stone-900">AI Concierge</p>
          <p className="mt-1">
            This is an AI voice assistant — not a human. Calls are recorded and
            transcribed to improve service. See our{" "}
            <a
              href="/privacy-policy"
              className="underline decoration-stone-400 underline-offset-2"
            >
              privacy policy
            </a>{" "}
            for voice-data handling. Prefer a person?{" "}
            <a
              href="mailto:stay@lamaisonhomes.com.au"
              className="underline decoration-stone-400 underline-offset-2"
            >
              Email us
            </a>
            .
          </p>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 text-[10px] uppercase tracking-wider text-stone-400 hover:text-stone-600"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-[10px] font-medium text-stone-500 shadow-sm backdrop-blur hover:text-stone-800"
        >
          AI voice · privacy info
        </button>
      )}
    </div>
  );
}
