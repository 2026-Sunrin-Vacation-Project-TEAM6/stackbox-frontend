import { NextResponse } from 'next/server'

/**
 * Resolves the GitHub authorize URL for the signed-in user.
 *
 * The backend's `GET /github/oauth/login` is authenticated and answers with a
 * 307 to github.com carrying a signed `state` token. The browser cannot follow
 * that itself: a plain `<a>` navigation sends no `Authorization` header, and a
 * cross-origin `fetch` gets an opaque redirect whose `Location` is unreadable —
 * and following it would leak our bearer token to github.com.
 *
 * This handler runs on the server, where `redirect: 'manual'` exposes the real
 * status and `Location` header, so it can read the URL and hand back only that.
 * No backend change is needed.
 */

/** Server-side backend URL: inside compose the browser's localhost is not ours. */
const BACKEND_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/** The only redirect target we will hand back to the client. */
const GITHUB_AUTHORIZE_PREFIX = 'https://github.com/login/oauth/authorize'

export async function GET(request: Request): Promise<NextResponse> {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/github/oauth/login`, {
      headers: { Authorization: authorization },
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }

  // The backend answers 401 when the token is stale, and 500 when GitHub OAuth
  // is not configured. Forward the status so the UI can tell those apart.
  if (response.status === 401) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  const location = response.headers.get('location')
  if (!location) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured on the server' },
      { status: 502 },
    )
  }

  // Only ever return a github.com authorize URL. Without this check, a
  // misconfigured or compromised backend could redirect the user anywhere and
  // this endpoint would launder it into a trusted-looking client navigation.
  if (!location.startsWith(GITHUB_AUTHORIZE_PREFIX)) {
    return NextResponse.json({ error: 'Unexpected authorization target' }, { status: 502 })
  }

  return NextResponse.json({ url: location }, { headers: { 'Cache-Control': 'no-store' } })
}
