const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function setTokens({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getUserIdFromToken(): number | null {
  const token = getAccessToken()
  if (!token) return null

  try {
    // JWT tokens have three parts separated by dots: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode the payload (second part)
    const payload = parts[1]
    const decoded = atob(payload)
    const claims = JSON.parse(decoded) as { sub?: string | number; user_id?: string | number }

    // Try to extract user ID from common claim names
    const userId = claims.sub ?? claims.user_id
    return userId ? Number(userId) : null
  } catch {
    return null
  }
}