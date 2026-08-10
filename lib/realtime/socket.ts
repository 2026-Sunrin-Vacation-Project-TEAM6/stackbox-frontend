const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL!

export type DocUpdateMessage = {
  type: 'doc_update'
  blob: string
}

export type PresenceMessage = {
  type: 'presence'
  cursor_x?: number | null
  cursor_y?: number | null
  selection?: unknown
  color?: string | null
}

export type ClientMessage = DocUpdateMessage | PresenceMessage

export type RealtimeHandlers = {
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (message: ClientMessage) => void
}

export function connectRealtime(
  stackBoxId: number,
  token: string,
  handlers: RealtimeHandlers = {}
): WebSocket {
  const socket = new WebSocket(`${WORKER_URL}/ws/${stackBoxId}?token=${encodeURIComponent(token)}`)

  socket.onopen = () => handlers.onOpen?.()
  socket.onclose = (event) => handlers.onClose?.(event)
  socket.onerror = (event) => handlers.onError?.(event)
  socket.onmessage = (event) => {
    // web_worker also sends a bare "ping" text frame every 30s, not JSON
    if (event.data === 'ping') return

    try {
      handlers.onMessage?.(JSON.parse(event.data) as ClientMessage)
    } catch {
      // ignore frames that aren't valid ClientMessage JSON
    }
  }

  return socket
}

export function sendDocUpdate(socket: WebSocket, blob: string) {
  socket.send(JSON.stringify({ type: 'doc_update', blob } satisfies DocUpdateMessage))
}

export function sendPresence(socket: WebSocket, presence: Omit<PresenceMessage, 'type'>) {
  socket.send(JSON.stringify({ type: 'presence', ...presence } satisfies PresenceMessage))
}
