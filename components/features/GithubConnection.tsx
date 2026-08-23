'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { isNotFound } from '@/lib/api/client'
import { getAccount, getAuthorizeUrl } from '@/lib/api/github'
import type { GithubAccount } from '@/lib/api/types'

/**
 * §16's GitHub 연동 row: Connected + username, or Not connected + [Connect].
 *
 * Shared by /settings and /github so the two can never disagree about whether
 * an account is attached.
 *
 * There is no Disconnect: the backend exposes no endpoint that revokes the
 * stored token (see backend/app/routers/github.py — account, repos, contents,
 * import, and the two OAuth routes, no DELETE). Rendering a button that could
 * only fail would be worse than not having one, so the honest statement is
 * shown instead.
 */
export function GithubConnection({
  onStatusChange,
  showBrowseLink = false,
}: {
  onStatusChange?: (connected: boolean) => void
  showBrowseLink?: boolean
}) {
  const [account, setAccount] = useState<GithubAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getAccount()
      .then((data) => {
        if (cancelled) return
        setAccount(data)
        onStatusChange?.(true)
      })
      .catch((cause) => {
        if (cancelled) return
        // 404 is the not-connected state, which is normal — not a failure.
        if (isNotFound(cause)) {
          setAccount(null)
          onStatusChange?.(false)
        } else {
          setError(cause instanceof Error ? cause.message : 'Failed to read GitHub status')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // onStatusChange is a callback prop; re-running on its identity would
    // re-fetch on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      // Resolved server-side, because the backend's kickoff endpoint needs our
      // bearer token and answers with a cross-origin redirect the browser
      // cannot read. See app/api/github/authorize-url/route.ts.
      window.location.href = await getAuthorizeUrl()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start GitHub authorization')
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule py-5">
      <div className="flex min-w-0 items-start gap-4">
        {/*
         * Connected / not connected is a binary fact, so it gets a marker that
         * can be read without reading: a filled primary square when the account
         * is attached, an empty ruled one when it is not. §27 — no icon, just
         * the same square the rest of the app uses for state.
         */}
        <span
          className={`mt-1.5 h-3 w-3 shrink-0 ${
            loading ? 'border-2 border-rule' : account ? 'bg-primary' : 'border-2 border-text'
          }`}
          aria-hidden
        />

        <div className="flex min-w-0 flex-col gap-1">
          <span className="sb-label text-muted">GitHub</span>

          {loading ? (
            <span className="text-[17px] text-muted">Checking…</span>
          ) : account ? (
            <span className="truncate text-[17px] font-medium">
              Connected
              <span className="font-normal text-muted"> · {account.github_login}</span>
            </span>
          ) : (
            <span className="text-[17px] text-muted">Not connected</span>
          )}

          {error && <span className="text-[15px] text-danger">{error}</span>}
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-4">
          {account && showBrowseLink && (
            <Link
              href="/github"
              className="sb-label border-b-2 border-transparent pb-0.5 text-muted transition-colors duration-100 hover:border-text hover:text-text"
            >
              Browse repositories
            </Link>
          )}

          {!account && (
            <Button variant="secondary" onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Redirecting…' : 'Connect GitHub'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
