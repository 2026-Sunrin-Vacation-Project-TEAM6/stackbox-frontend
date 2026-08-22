'use client'

import { useEffect, useState } from 'react'

import { GithubConnection } from '@/components/features/GithubConnection'
import { Button } from '@/components/ui/Button'
import type { User } from '@/lib/api/types'
import { getCurrentUser, updateUser } from '@/lib/api/users'

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCurrentUser()
      .then((data) => {
        if (cancelled) return
        setUser(data)
        setName(data.name)
        setAvatarUrl(data.avatar_url ?? '')
      })
      .catch((cause) => {
        if (!cancelled) setError(describe(cause, 'Failed to load profile'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const updated = await updateUser(user.id, { name, avatar_url: avatarUrl || null })
      setUser(updated)
      setSaved(true)
    } catch (cause) {
      setError(describe(cause, 'Failed to save profile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="px-8 py-8 text-[15px] text-muted">Loading…</p>
  if (!user) {
    return <p className="px-8 py-8 text-[15px] text-danger">{error ?? 'Profile not found'}</p>
  }

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-8">
      {/*
       * The page name is the page name, not a 12px caption above the fields. A
       * kicker states the section, the heading states the subject — the same
       * two-line head the dashboard and the document use.
       */}
      <span className="sb-label text-faint">Account</span>
      <h1 className="pt-1.5 text-[1.875rem] leading-none font-bold tracking-[-0.025em]">
        Settings
      </h1>

      <form onSubmit={handleSubmit} className="pt-8">
        <h2 className="sb-label border-b-2 border-text pb-2.5 text-muted">Profile</h2>

        <label className="flex flex-col gap-1.5 border-b border-rule py-4">
          <span className="sb-label text-muted">Email</span>
          <input
            type="email"
            value={user.email}
            disabled
            className="bg-transparent text-[17px] text-faint outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 border-b border-rule py-4">
          <span className="sb-label text-muted">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-transparent text-[17px] outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 border-b border-rule py-4">
          <span className="sb-label text-muted">Avatar URL</span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://"
            className="bg-transparent text-[17px] outline-none placeholder:text-faint"
          />
        </label>

        <div className="flex items-center gap-4 pt-5 pb-10">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>

          {/* State reported as state, in the system voice — not a toast. */}
          {error && (
            <span className="border-l-4 border-danger bg-sunken px-3 py-2 text-[15px] text-danger">
              {error}
            </span>
          )}
          {saved && !error && <span className="sb-label text-primary">Saved</span>}
        </div>
      </form>

      {/*
       * §16's GitHub 연동 section. Outside the profile <form> on purpose: it
       * navigates away to GitHub, and a control that leaves the page has no
       * business sitting inside a form that saves fields.
       */}
      <h2 className="sb-label border-b-2 border-text pb-2.5 text-muted">Connections</h2>
      <GithubConnection showBrowseLink />
    </div>
  )
}
