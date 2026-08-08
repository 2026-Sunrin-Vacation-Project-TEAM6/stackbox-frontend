'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api/client'

type Workspace = {
  id: number
  name: string
  slug: string
}

type StackBox = {
  id: number
  workspace_id: number
  parent_id: number | null
  type: 'folder' | 'page' | 'canvas' | 'edgeless'
  name: string
}

export default function DocsPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)
  const [stackBoxes, setStackBoxes] = useState<StackBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false

    apiFetch<Workspace[]>('/workspaces')
      .then((data) => {
        if (cancelled) return
        setWorkspaces(data)
        setWorkspaceId(data[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load workspaces')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (workspaceId === null) return
    let cancelled = false

    apiFetch<StackBox[]>(`/stack-boxes?workspace_id=${workspaceId}`)
      .then((data) => {
        if (!cancelled) setStackBoxes(data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load docs')
      })

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function handleCreate() {
    if (workspaceId === null) return
    setCreating(true)
    setError(null)

    try {
      const stackBox = await apiFetch<StackBox>('/stack-boxes', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceId,
          type: 'page',
          name: 'Untitled',
        }),
      })
      router.push(`/docs/${stackBox.id}`)
    } catch {
      setError('Failed to create doc')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Docs</h1>

        <div className="flex items-center gap-3">
          {workspaces.length > 1 && (
            <select
              value={workspaceId ?? ''}
              onChange={(event) => setWorkspaceId(Number(event.target.value))}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          )}

          <Button onClick={handleCreate} disabled={creating || workspaceId === null}>
            {creating ? 'Creating…' : 'New doc'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stackBoxes.length === 0 ? (
        <p className="text-sm text-zinc-500">No docs yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {stackBoxes.map((stackBox) => (
            <li key={stackBox.id}>
              <button
                onClick={() => router.push(`/docs/${stackBox.id}`)}
                className="w-full py-3 text-left text-sm hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {stackBox.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
