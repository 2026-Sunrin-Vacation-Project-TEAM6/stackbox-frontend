import { apiFetch } from '@/lib/api/client'
import type { TokenResponse } from '@/lib/api/types'
import { clearTokens, getRefreshToken, setTokens } from '@/lib/auth/token'

/** `POST /auth/register` — 409 if the email is already registered. */
export async function register(input: {
  email: string
  password: string
  name: string
}): Promise<TokenResponse> {
  const tokens = await apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: input,
  })
  store(tokens)
  return tokens
}

/** `POST /auth/login` — 401 for both a wrong password and an unknown email. */
export async function login(input: { email: string; password: string }): Promise<TokenResponse> {
  const tokens = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: input,
  })
  store(tokens)
  return tokens
}

/**
 * `POST /auth/logout` — revokes the refresh session server-side, then clears
 * local storage.
 *
 * The local clear happens even if the request fails: the user asked to sign
 * out, and leaving valid tokens in the browser because the network blipped is
 * the worse outcome. The stale server-side session expires on its own.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  try {
    if (refreshToken) {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        auth: false,
        body: { refresh_token: refreshToken },
      })
    }
  } finally {
    clearTokens()
  }
}

function store(tokens: TokenResponse): void {
  setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
}
