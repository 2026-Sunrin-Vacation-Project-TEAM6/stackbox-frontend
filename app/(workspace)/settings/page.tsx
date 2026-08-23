'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api/client'
import { getUserIdFromToken } from '@/lib/auth/token'

type User = {
  id: number
  email: string
  name: string
  avatar_url: string | null
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
    const userId = getUserIdFromToken()
    if (!userId) {
      setError('Not signed in')
      setLoading(false)
      return
    }

    let cancelled = false

    apiFetch<User>(`/users/${userId}`)
      .then((data) => {
        if (cancelled) return
        setUser(data)
        setName(data.name)
        setAvatarUrl(data.avatar_url ?? '')
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load profile')
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
      const updated = await apiFetch<User>(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, avatar_url: avatarUrl || null }),
      })
      setUser(updated)
      setSaved(true)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (!user) return <p className="text-sm text-red-600">{error ?? 'Profile not found'}</p>

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          value={user.email}
          disabled
          className="rounded border border-zinc-300 px-3 py-2 text-base opacity-50 dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Avatar URL
        <input
          type="url"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved</p>}

      <Button type="submit" disabled={saving} className="self-start">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
