import { apiFetch } from '@/lib/api/client'
import type {
  GithubAccount,
  GithubContent,
  GithubImportResult,
  GithubRepo,
} from '@/lib/api/types'
import { getAccessToken } from '@/lib/auth/token'

/**
 * `GET /github/account` — the connected GitHub identity.
 *
 * 404 is the "not connected" state, which is normal. Callers should check
 * `isNotFound(error)` rather than showing a failure.
 */
export function getAccount(): Promise<GithubAccount> {
  return apiFetch<GithubAccount>('/github/account')
}

/** `GET /github/repos` — repos the connected account can read. */
export function listRepos(): Promise<GithubRepo[]> {
  return apiFetch<GithubRepo[]>('/github/repos')
}

/** `GET /github/repos/{owner}/{repo}/contents?path=` — one directory level. */
export function listContents(
  owner: string,
  repo: string,
  path = '',
): Promise<GithubContent[]> {
  const query = path ? `?path=${encodeURIComponent(path)}` : ''
  return apiFetch<GithubContent[]>(
    `/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${query}`,
  )
}

/** `POST /github/import` — imports each path as a block on the stack box. */
export function importFiles(input: {
  owner: string
  repo: string
  paths: string[]
  stack_box_id: number
}): Promise<GithubImportResult> {
  return apiFetch<GithubImportResult>('/github/import', { method: 'POST', body: input })
}

/**
 * Resolves the GitHub authorize URL to send the user to.
 *
 * `GET /github/oauth/login` on the backend is an authenticated endpoint that
 * answers with a 307 to github.com. A browser cannot use it directly: a plain
 * navigation carries no `Authorization` header, and a `fetch` cannot read the
 * `Location` off a cross-origin redirect (the response is opaque, and following
 * it would send our bearer token to github.com).
 *
 * So the redirect is resolved by our own Route Handler, which runs server-side
 * where the `Location` header is readable, and hands back just the URL.
 */
export async function getAuthorizeUrl(): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in')

  const response = await fetch('/api/github/authorize-url', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'Could not start GitHub authorization')
  }

  const { url } = (await response.json()) as { url: string }
  return url
}
