const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'ws://localhost:3000'

function getWebSocketBaseUrl(rawUrl: string): string {
  const normalized = rawUrl.trim().replace(/\/+$/, '')
  if (normalized.startsWith('ws://') || normalized.startsWith('wss://')) return normalized
  if (normalized.startsWith('http://')) return `ws://${normalized.slice('http://'.length)}`
  if (normalized.startsWith('https://')) return `wss://${normalized.slice('https://'.length)}`
  return 'ws://localhost:3000'
}

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
  /**
   * Stamped by web_worker with the sender's id before broadcast (see
   * web_worker/src/message.rs `stamp_presence_sender`), so it is present on
   * received frames and must not be set on sent ones — the server overwrites it
   * either way. This is the only stable identity a peer has: `color` is
   * derived and two peers can collide on it.
   */
  user_id?: number | null
}

/** Broadcast by the backend after a run so peers see the same output. */
export type CodeResultMessage = {
  type: 'code_result'
  block_id: number
  stdout: string
  stderr: string
  exit_code: number
  duration_ms: number
}

export type ClientMessage = DocUpdateMessage | PresenceMessage | CodeResultMessage

/**
 * What collaboration is currently doing, in terms a person can act on.
 *
 * `offline` is terminal: the relay rejected us or there is no token, and
 * retrying would only produce the same answer. `reconnecting` is not terminal —
 * it means edits are still being made but are not reaching anyone yet.
 */
export type RealtimeStatus = 'connecting' | 'open' | 'reconnecting' | 'offline'

export type RealtimeHandlers = {
  onStatus?: (status: RealtimeStatus, detail?: string) => void
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (message: ClientMessage) => void
}

/**
 * A live relay session, rather than the raw socket.
 *
 * Callers deliberately cannot reach the underlying WebSocket: across a reconnect
 * there is no single socket to hold, so anything that captured one would go
 * quietly dead while looking connected.
 */
export type RealtimeConnection = {
  /** Sends a frame. Returns false when the relay is not connected right now. */
  send: (message: ClientMessage) => boolean
  status: () => RealtimeStatus
  close: () => void
}

const RECONNECT_BASE_MS = 600
const RECONNECT_MAX_MS = 15_000

/**
 * Close codes that mean "do not come back": the relay refused this session
 * rather than dropping it. 1008 is Starlette/tungstenite's policy violation,
 * which web_worker uses for a token it will not accept. Retrying these turns a
 * rejected session into an endless connect loop.
 */
const TERMINAL_CLOSE_CODES = new Set([1008, 4401, 4403])

export function connectRealtime(
  stackBoxId: number,
  /*
   * A getter, not a token. A reconnect can happen minutes after the first
   * connect, by which point the access token captured at mount may have been
   * rotated by the refresh flow — so the token is read at each attempt.
   */
  getToken: () => string | null,
  handlers: RealtimeHandlers = {},
): RealtimeConnection {
  let socket: WebSocket | null = null
  let status: RealtimeStatus = 'connecting'
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  function setStatus(next: RealtimeStatus, detail?: string) {
    status = next
    handlers.onStatus?.(next, detail)
  }

  function open() {
    timer = null
    if (disposed) return

    const token = getToken()
    if (!token) {
      setStatus('offline', 'Not signed in')
      return
    }

    setStatus(attempt === 0 ? 'connecting' : 'reconnecting')

    const wsBase = getWebSocketBaseUrl(WORKER_URL)
    let next: WebSocket
    try {
      next = new WebSocket(`${wsBase}/ws/${stackBoxId}?token=${encodeURIComponent(token)}`)
    } catch {
      setStatus('offline', 'Realtime endpoint is misconfigured')
      return
    }
    socket = next

    next.onopen = () => {
      attempt = 0
      setStatus('open')
      handlers.onOpen?.()
    }

    next.onerror = (event) => handlers.onError?.(event)

    next.onclose = (event) => {
      // Ignore the death rattle of a socket we have already replaced.
      if (next !== socket) return
      socket = null
      handlers.onClose?.(event)
      if (disposed) return

      if (TERMINAL_CLOSE_CODES.has(event.code)) {
        setStatus('offline', 'The collaboration server refused this session')
        return
      }
      schedule()
    }

    next.onmessage = (event) => {
      // web_worker also sends a bare "ping" text frame every 30s, not JSON
      if (event.data === 'ping') return

      try {
        handlers.onMessage?.(JSON.parse(event.data) as ClientMessage)
      } catch {
        // ignore frames that aren't valid ClientMessage JSON
      }
    }
  }

  function schedule() {
    if (disposed || timer !== null) return

    /*
     * Exponential, capped, and jittered. The cap matters more than the curve:
     * a relay that is down during local development is down for minutes, and a
     * fixed 1s retry would spend that time filling the console with failures —
     * which is exactly how a transient outage came to look like a bug.
     */
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
    attempt += 1
    setStatus('reconnecting')
    timer = setTimeout(open, delay + Math.random() * 250)
  }

  /*
   * Coming back onto the network is real information, so it pre-empts whatever
   * backoff we were sitting in — otherwise reopening a laptop means waiting out
   * a 15s timer before collaboration resumes.
   */
  function onOnline() {
    if (disposed || socket !== null || status === 'offline') return
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    attempt = 0
    open()
  }

  if (typeof window !== 'undefined') window.addEventListener('online', onOnline)

  open()

  return {
    send(message) {
      if (socket?.readyState !== WebSocket.OPEN) return false
      socket.send(JSON.stringify(message))
      return true
    },
    status: () => status,
    close() {
      disposed = true
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline)
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      const current = socket
      socket = null
      current?.close()
    },
  }
}

export function sendDocUpdate(connection: RealtimeConnection, blob: string): boolean {
  return connection.send({ type: 'doc_update', blob })
}

/**
 * Sends a presence frame. `user_id` is intentionally not accepted: web_worker
 * overwrites whatever a client supplies with the authenticated sender's id.
 */
export function sendPresence(
  connection: RealtimeConnection,
  presence: Omit<PresenceMessage, 'type' | 'user_id'>,
): boolean {
  return connection.send({ type: 'presence', ...presence })
}
