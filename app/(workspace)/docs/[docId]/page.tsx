'use client'

import { use, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api/client'
import { getAccessToken } from '@/lib/auth/token'
import { connectRealtime, sendPresence } from '@/lib/realtime/socket'

type StackBox = {
  id: number
  name: string
}

type Block = {
  id: number
  stack_box_id: number
  type: 'markdown' | 'code' | 'image' | 'embed'
  language: string | null
  content: string
  sort_order: number
}

type PresencePeer = {
  cursor_x?: number | null
  cursor_y?: number | null
  color?: string | null
}

export default function DocPage({ params }: PageProps<'/docs/[docId]'>) {
  const { docId } = use(params)
  const stackBoxId = Number(docId)

  const [stackBox, setStackBox] = useState<StackBox | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [peers, setPeers] = useState<PresencePeer[]>([])
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiFetch<StackBox>(`/stack-boxes/${stackBoxId}`),
      apiFetch<Block[]>(`/stack-boxes/${stackBoxId}/blocks`),
    ])
      .then(([box, boxBlocks]) => {
        if (cancelled) return
        setStackBox(box)
        setBlocks(boxBlocks.sort((a, b) => a.sort_order - b.sort_order))
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load doc')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [stackBoxId])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    const socket = connectRealtime(stackBoxId, token, {
      onMessage: (message) => {
        if (message.type === 'presence') {
          setPeers((current) => [
            ...current.filter((peer) => peer.color !== message.color),
            message,
          ])
        }
      },
    })
    socketRef.current = socket

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [stackBoxId])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    sendPresence(socket, { cursor_x: event.clientX, cursor_y: event.clientY })
  }

  async function handleBlockChange(blockId: number, content: string) {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? { ...block, content } : block))
    )
  }

  async function handleBlockBlur(blockId: number, content: string) {
    try {
      await apiFetch<Block>(`/blocks/${blockId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      })
    } catch {
      setError('Failed to save block')
    }
  }

  async function handleAddBlock() {
    try {
      const block = await apiFetch<Block>(`/stack-boxes/${stackBoxId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({ type: 'markdown', content: '', sort_order: blocks.length }),
      })
      setBlocks((current) => [...current, block])
    } catch {
      setError('Failed to add block')
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (!stackBox) return <p className="text-sm text-red-600">{error ?? 'Doc not found'}</p>

  return (
    <div className="flex flex-col gap-4" onMouseMove={handleMouseMove}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{stackBox.name}</h1>
        <span className="text-xs text-zinc-500">{peers.length} online</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <textarea
            key={block.id}
            value={block.content}
            onChange={(event) => handleBlockChange(block.id, event.target.value)}
            onBlur={(event) => handleBlockBlur(block.id, event.target.value)}
            rows={4}
            className="w-full resize-y rounded border border-zinc-300 p-3 font-mono text-sm dark:border-zinc-700 dark:bg-transparent"
          />
        ))}
      </div>

      <Button variant="secondary" onClick={handleAddBlock} className="self-start">
        Add block
      </Button>
    </div>
  )
}
