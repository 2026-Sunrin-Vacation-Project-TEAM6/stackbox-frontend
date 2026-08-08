'use client'

import { useEffect, useState } from 'react'

import { apiFetch } from '@/lib/api/client'
import { connectRealtime } from '@/lib/realtime/socket'

type ApiStatus = 'checking' | 'online' | 'offline'
type SocketStatus = 'connecting' | 'connected' | 'disconnected'

const DEMO_STACK_BOX_ID = 1

export function SystemStatus() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting')

  useEffect(() => {
    let cancelled = false

    apiFetch<{ status: string }>('/health', { auth: false })
      .then(() => {
        if (!cancelled) setApiStatus('online')
      })
      .catch(() => {
        if (!cancelled) setApiStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const socket = connectRealtime(DEMO_STACK_BOX_ID, {
      onOpen: () => setSocketStatus('connected'),
      onClose: () => setSocketStatus('disconnected'),
      onError: () => setSocketStatus('disconnected'),
    })

    return () => socket.close()
  }, [])

  return (
    <dl className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <dt>API</dt>
        <dd className="font-medium">{apiStatus}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt>Realtime</dt>
        <dd className="font-medium">{socketStatus}</dd>
      </div>
    </dl>
  )
}
