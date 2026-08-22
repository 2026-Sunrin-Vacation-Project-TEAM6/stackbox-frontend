'use client'

import { useEffect, useState } from 'react'

import { checkHealth } from '@/lib/api/health'

type ApiStatus = 'checking' | 'online' | 'offline'

const LABELS: Record<ApiStatus, string> = {
  checking: 'checking',
  online: 'reachable',
  offline: 'unreachable',
}

/**
 * Whether the API is answering.
 *
 * Realtime is deliberately not reported here. A WebSocket on this service is
 * per-room (`/ws/{stack_box_id}`), so probing it outside a document meant
 * opening a connection to a hardcoded room id — which reported the health of
 * one arbitrary doc, or nothing at all if it did not exist. Live collaboration
 * state now belongs to the workspace bar, where there is a real room to speak
 * about.
 */
export function SystemStatus() {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    let cancelled = false

    checkHealth()
      .then(() => {
        if (!cancelled) setStatus('online')
      })
      .catch(() => {
        if (!cancelled) setStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="sb-label flex items-center gap-2.5 text-muted">
      {/*
       * A 7px dot at 11px type was indistinguishable from a stray pixel. The
       * marker is now a 10px square carrying the same meaning the workspace
       * bar's indicator does: filled when there is nothing to say, danger when
       * there is, hollow while unknown.
       */}
      <span
        aria-hidden
        className={`h-2.5 w-2.5 shrink-0 ${
          status === 'online'
            ? 'bg-primary'
            : status === 'offline'
              ? 'bg-danger'
              : 'border-2 border-rule'
        }`}
      />
      API {LABELS[status]}
    </p>
  )
}
