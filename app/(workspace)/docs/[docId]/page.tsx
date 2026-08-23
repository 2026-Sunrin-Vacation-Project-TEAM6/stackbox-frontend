'use client'

import { use, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'

import { BlockEditor, type Block } from '@/components/blocks/BlockEditor'
import { CanvasBoard } from '@/components/blocks/CanvasBoard'
import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api/client'
import { getAccessToken } from '@/lib/auth/token'
import { connectRealtime, sendPresence } from '@/lib/realtime/socket'
import {
  applyRemoteUpdate,
  attachDocBroadcast,
  getOrCreateBlockText,
  hydrateDoc,
  pushSnapshot,
} from '@/lib/realtime/ydoc'

type StackBox = {
  id: number
  name: string
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
  const [docHydrated, setDocHydrated] = useState(false)
  const [view, setView] = useState<'list' | 'canvas'>('list')
  const socketRef = useRef<WebSocket | null>(null)
  const docHydratedRef = useRef(false)

  const doc = useMemo(() => new Y.Doc(), [stackBoxId])

  useEffect(() => {
    return () => {
      doc.destroy()
    }
  }, [doc])

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

  // Load the compacted snapshot + trailing updates onto the shared doc before
  // any block is bound to it, so blocks don't seed stale REST content over
  // real collaborative history.
  useEffect(() => {
    let cancelled = false
    setDocHydrated(false)

    hydrateDoc(doc, stackBoxId).then(() => {
      if (!cancelled) setDocHydrated(true)
    })

    return () => {
      cancelled = true
    }
  }, [doc, stackBoxId])

  useEffect(() => {
    docHydratedRef.current = docHydrated
  }, [docHydrated])

  // Once both the block list and the doc's collaborative history are loaded,
  // make sure every block has a shared Y.Text (existing history wins; only
  // brand-new blocks get seeded from their REST content).
  useEffect(() => {
    if (loading || !docHydrated) return
    for (const block of blocks) {
      getOrCreateBlockText(doc, block.id, block.content)
    }
  }, [doc, loading, docHydrated, blocks])

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
        } else if (message.type === 'doc_update') {
          applyRemoteUpdate(doc, message.blob)
        }
      },
    })
    socketRef.current = socket
    const detachBroadcast = attachDocBroadcast(doc, socket)

    return () => {
      detachBroadcast()
      socket.close()
      socketRef.current = null
    }
  }, [doc, stackBoxId])

  // Compact the update log into a single snapshot when leaving the doc, so the
  // next hydrateDoc doesn't have to replay the full update history.
  useEffect(() => {
    return () => {
      if (docHydratedRef.current) {
        pushSnapshot(doc, stackBoxId).catch(() => {})
      }
    }
  }, [doc, stackBoxId])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    sendPresence(socket, { cursor_x: event.clientX, cursor_y: event.clientY })
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
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1 text-sm ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('canvas')}
              className={`px-3 py-1 text-sm ${view === 'canvas' ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
            >
              Canvas
            </button>
          </div>
          <span className="text-xs text-zinc-500">{peers.length} online</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {view === 'canvas' ? (
        <CanvasBoard blocks={blocks} doc={doc} docHydrated={docHydrated} onBlur={handleBlockBlur} />
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              ytext={docHydrated ? getOrCreateBlockText(doc, block.id, block.content) : undefined}
              onBlur={handleBlockBlur}
            />
          ))}
        </div>
      )}

      <Button variant="secondary" onClick={handleAddBlock} className="self-start">
        Add block
      </Button>
    </div>
  )
}
