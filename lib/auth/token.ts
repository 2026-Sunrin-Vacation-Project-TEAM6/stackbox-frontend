const ACCESS_TOKEN_KEY = 'stackbox.access_token'
const REFRESH_TOKEN_KEY = 'stackbox.refresh_token'

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens({ accessToken, refreshToken }: TokenPair): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getUserIdFromToken(): number | null {
  const token = getAccessToken()
  if (!token) return null

  try {
    const [, payload] = token.split('.')
    const { sub } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const userId = Number(sub)
    return Number.isFinite(userId) ? userId : null
  } catch {
    return null
  }
}
