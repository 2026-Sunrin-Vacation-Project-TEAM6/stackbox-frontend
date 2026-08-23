
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/auth/token'

/**
 * Base URL of the FastAPI backend, as reached from the *browser*.
 *
 * Falls back to the compose default rather than asserting non-null: a missing
 * env var used to produce requests to the string "undefined/workspaces", which
 * fails as an opaque 404 instead of naming the real problem.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'

/**
 * A non-2xx response, with the status kept intact.
 *
 * Call sites need the status to tell apart cases that look identical in a
 * message string: 404 on `/github/account` means "not connected yet" (a normal
 * state), 403 on a workspace means "your role is too low", and 409 on register
 * means "that email is taken". Collapsing these into `Error('...')` is why the
 * old screens could only ever say "Failed to load".
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail || `API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** True when the failure means "this thing does not exist", not "this broke". */
export function isNotFound(error: unknown): boolean {
  return isApiError(error) && error.status === 404
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  /** Send the bearer token. Default true; set false for /health and /auth/*. */
  auth?: boolean
  /** JSON-serialized automatically. Pass a string/FormData through `raw` instead. */
  body?: unknown
  /** Bypass JSON serialization for the request body. */
  raw?: BodyInit
}

/**
 * FastAPI reports errors as `{"detail": ...}`, where `detail` is a string for
 * `HTTPException` but an array of per-field objects for request validation
 * (422). Flatten both into one human-readable line.
 */
function extractDetail(status: number, text: string): string {
  if (!text) return `API error ${status}`

  try {
    const parsed = JSON.parse(text) as { detail?: unknown }
    const detail = parsed.detail

    if (typeof detail === 'string') return detail

    if (Array.isArray(detail)) {
      return (
        detail
          .map((entry) => {
            const item = entry as { loc?: unknown[]; msg?: string }
            const field = Array.isArray(item.loc) ? item.loc.at(-1) : undefined
            return field ? `${String(field)}: ${item.msg ?? 'invalid'}` : (item.msg ?? 'invalid')
          })
          .join(', ') || `API error ${status}`
      )
    }

    return text
  } catch {
    return text
  }
}

/*
 * Refresh is single-flight on purpose. `/auth/refresh` *rotates* the token —
 * it deletes the presented session row and issues a new one (see
 * backend/app/routers/auth.py) — so two concurrent refreshes would race, and
 * the loser would send an already-deleted token and get logged out. Since a
 * page load fires several requests at once, that race is the common case, not
 * the rare one.
 */
let refreshInFlight: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) return false

    const tokens = (await response.json()) as { access_token: string; refresh_token: string }
    setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
    return true
  } catch {
    // Network failure is not proof the session is dead, but we have no token to
    // retry with either. Report failure and let the caller surface the 401.
    return false
  }
}

function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    const attempt = performRefresh()
    refreshInFlight = attempt
    // performRefresh never rejects, so this cannot orphan a rejection.
    void attempt.finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * Drops the session and sends the browser to /login.
 *
 * Uses a hard location change rather than the router: this can fire from
 * anywhere (including outside React), and a full reload is what guarantees no
 * stale authenticated state survives the sign-out.
 */
function abandonSession(): void {
  clearTokens()
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.href = '/login'
}

async function send(path: string, options: ApiOptions, withAuth: boolean): Promise<Response> {
  const { auth: _auth, body, raw, headers, ...rest } = options

  const requestHeaders = new Headers(headers)
  if (withAuth) {
    const token = getAccessToken()
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let payload: BodyInit | undefined = raw
  if (payload === undefined && body !== undefined) {
    payload = JSON.stringify(body)
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  }

  return fetch(`${API_BASE}${path}`, { ...rest, headers: requestHeaders, body: payload })
}

/**
 * Performs a request and, on a 401, refreshes the session once and retries.
 *
 * Returns the raw `Response` so callers that want something other than JSON
 * (the .pptx download) can read it themselves.
 */
export async function apiRequest(path: string, options: ApiOptions = {}): Promise<Response> {
  const withAuth = options.auth !== false
  let response = await send(path, options, withAuth)

  // Only an authenticated request can be fixed by refreshing, and only if we
  // actually held a token — a 401 with no token means "not signed in", which is
  // the caller's business (e.g. the login form), not a session to recover.
  if (response.status === 401 && withAuth && getAccessToken()) {
    if (await refreshTokens()) {
      response = await send(path, options, withAuth)
    }

    if (response.status === 401) {
      abandonSession()
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractDetail(response.status, await response.text()))
  }

  return response
}

/**
 * Performs a request and decodes the JSON body.
 *
 * `T` is returned as `undefined` for an empty body. That is not a convenience:
 * every DELETE and `/auth/logout` on this backend answers 204 No Content, and
 * unconditionally calling `response.json()` made those calls throw a JSON parse
 * error *after* having successfully performed the deletion.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiRequest(path, options)

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T

  return JSON.parse(text) as T
}

/** Performs a request and returns the body as a `Blob` (file downloads). */
export async function apiBlob(path: string, options: ApiOptions = {}): Promise<Blob> {
  return (await apiRequest(path, options)).blob()
}

export { API_BASE }
