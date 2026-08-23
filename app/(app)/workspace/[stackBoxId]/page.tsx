'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'

import { BlockEditor, type Block, type BlockActions } from '@/components/blocks/BlockEditor'
import { CanvasBoard, type CanvasBoardHandle } from '@/components/blocks/CanvasBoard'
import { Menu, MenuItem, MenuSection } from '@/components/ui/Menu'
import { BlockInserter, type InsertSpec } from '@/components/workspace/BlockInserter'
import { useRegisterCommands } from '@/components/workspace/CommandPalette'
import { DocReactions } from '@/components/workspace/DocReactions'
import { SURFACES, type Surface } from '@/components/workspace/SurfaceSwitcher'
import { WorkspaceBar } from '@/components/workspace/WorkspaceBar'
import { useWorkspaces } from '@/components/workspace/WorkspaceProvider'
import { docToPpt, saveBlob, summarize } from '@/lib/api/ai'
import { createBlock, deleteBlock, listBlocks, updateBlock } from '@/lib/api/blocks'
import { runBlock, toRunState, type RunState } from '@/lib/api/code'
import { getStackBox, updateStackBox } from '@/lib/api/stackBoxes'
import type { StackBox } from '@/lib/api/types'
import { getAccessToken, getUserIdFromToken } from '@/lib/auth/token'
import {
  connectRealtime,
  sendPresence,
  type RealtimeConnection,
  type RealtimeStatus,
} from '@/lib/realtime/socket'
import {
  applyRemoteUpdate,
  attachDocBroadcast,
  getOrCreateBlockText,
  hydrateDoc,
  pushSnapshot,
} from '@/lib/realtime/ydoc'

type PresencePeer = {
  user_id: number
  cursor_x?: number | null
  cursor_y?: number | null
  color?: string | null
}

/** Turns an API failure into something worth reading. */
function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

export default function WorkspacePage({ params }: PageProps<'/workspace/[stackBoxId]'>) {
  const { stackBoxId: rawStackBoxId } = use(params)
  const stackBoxId = Number(rawStackBoxId)

  const { adopt } = useWorkspaces()

  const [stackBox, setStackBox] = useState<StackBox | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [peers, setPeers] = useState<PresencePeer[]>([])
  const [docHydrated, setDocHydrated] = useState(false)
  const [surface, setSurface] = useState<Surface>('document')
  const canvasBoardRef = useRef<CanvasBoardHandle>(null)
  const [flowRunning, setFlowRunning] = useState(false)
  const [runs, setRuns] = useState<Record<number, RunState>>({})
  const [inserting, setInserting] = useState(false)
  const [renameIntent, setRenameIntent] = useState(0)
  const [connection, setConnection] = useState<{
    status: RealtimeStatus
    detail?: string
  }>({ status: 'connecting' })
  const connectionRef = useRef<RealtimeConnection | null>(null)
  const docHydratedRef = useRef(false)
  // Read by the action handlers, which must see the current list without being
  // rebuilt (and re-rendering every block) on each keystroke-driven update.
  const blocksRef = useRef<Block[]>([])

  // Our own id, so we can drop our presence out of the peer list: the relay
  // echoes every frame back to its sender, so without this you are always
  // counted as one of your own collaborators.
  const selfId = useMemo(() => getUserIdFromToken(), [])

  const doc = useMemo(() => new Y.Doc(), [stackBoxId])

  useEffect(() => {
    return () => {
      doc.destroy()
    }
  }, [doc])

  /*
   * The doc and its blocks load independently, on purpose.
   *
   * These were one `Promise.all`, which meant a single failing request took the
   * whole surface down to a bare error string — you could not see the doc's name,
   * switch to the Canvas, or reach any command, because the block list did not
   * come back. They are not one fact: the doc exists whether or not its blocks
   * can be read right now, so a blocks failure is reported on the workspace's
   * edge and everything else stays usable.
   */
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getStackBox(stackBoxId)
      .then((box) => {
        if (cancelled) return
        setStackBox(box)
        /*
         * The doc names its own workspace, so the chrome follows it. Arriving by
         * URL — a shared link, a reload, the back button — says nothing about
         * which workspace the switcher was last pointed at, and without this the
         * header would confidently name the wrong one.
         */
        adopt(box.workspace_id)
      })
      .catch((cause) => {
        if (!cancelled) setError(describe(cause, 'Failed to load doc'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [adopt, stackBoxId])

  useEffect(() => {
    let cancelled = false

    listBlocks(stackBoxId)
      .then((boxBlocks) => {
        if (!cancelled) setBlocks([...boxBlocks].sort((a, b) => a.sort_order - b.sort_order))
      })
      .catch((cause) => {
        if (!cancelled) setError(describe(cause, 'Failed to load blocks'))
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

  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

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
    const realtime = connectRealtime(stackBoxId, getAccessToken, {
      onStatus: (status, detail) => setConnection({ status, detail }),
      onClose: () => setPeers([]),
      onMessage: (message) => {
        if (message.type === 'presence') {
          /*
           * Keyed on the server-stamped `user_id`, not `color`: web_worker is
           * the only party that knows who sent a frame, and two peers can share
           * a color. A frame with no user_id can't be attributed to anyone, and
           * our own echo isn't a peer.
           */
          const userId = message.user_id
          if (userId == null || userId === selfId) return
          setPeers((current) => [
            ...current.filter((peer) => peer.user_id !== userId),
            { ...message, user_id: userId },
          ])
        } else if (message.type === 'doc_update') {
          applyRemoteUpdate(doc, message.blob)
        } else if (message.type === 'code_result') {
          // A peer ran this block: show the same output they got, rather than
          // leaving collaborators looking at a stale result.
          setRuns((current) => ({
            ...current,
            [message.block_id]: {
              status: 'done',
              stdout: message.stdout,
              stderr: message.stderr,
              exitCode: message.exit_code,
              durationMs: message.duration_ms,
            },
          }))
        }
      },
    })
    connectionRef.current = realtime
    const detachBroadcast = attachDocBroadcast(doc, realtime)

    return () => {
      detachBroadcast()
      realtime.close()
      connectionRef.current = null
      setPeers([])
    }
  }, [doc, stackBoxId, selfId])

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
    const realtime = connectionRef.current
    if (!realtime) return
    // Drops the frame when the relay is down, which is the correct outcome for a
    // cursor position: it is only interesting while someone can see it.
    sendPresence(realtime, { cursor_x: event.clientX, cursor_y: event.clientY })
  }

  const patchBlock = useCallback(async (blockId: number, body: Partial<Block>) => {
    const updated = await updateBlock(blockId, body)
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? { ...block, ...updated } : block)),
    )
    return updated
  }, [])

  /**
   * Writes any block whose live Y.Text has drifted from its persisted content.
   *
   * Both Run and Generate presentation read the *persisted* rows on the server,
   * so without this they operate on the previous revision. The truth is the
   * shared Y.Text, not `blocks` state (which only catches up on blur).
   */
  const flushPending = useCallback(
    async (only?: number) => {
      if (!docHydratedRef.current) return
      const candidates = only
        ? blocksRef.current.filter((block) => block.id === only)
        : blocksRef.current

      await Promise.all(
        candidates.map(async (block) => {
          const content = getOrCreateBlockText(doc, block.id, block.content).toString()
          if (content !== block.content) await patchBlock(block.id, { content })
        }),
      )
    },
    [doc, patchBlock],
  )

  const actions = useMemo<BlockActions>(
    () => ({
      onSave: (blockId, content) => {
        patchBlock(blockId, { content }).catch((cause) =>
          setError(describe(cause, 'Failed to save block')),
        )
      },

      onRun: async (blockId, stdin) => {
        setError(null)
        setRuns((current) => ({ ...current, [blockId]: { status: 'running' } }))
        try {
          await flushPending(blockId)
          const run = await runBlock(blockId, stdin)
          setRuns((current) => ({ ...current, [blockId]: toRunState(run) }))
        } catch (cause) {
          setRuns((current) => ({
            ...current,
            [blockId]: {
              status: 'failed',
              message: describe(cause, 'Could not reach the code runner.'),
            },
          }))
        }
      },

      onLanguageChange: (blockId, language) => {
        patchBlock(blockId, { language }).catch((cause) =>
          setError(describe(cause, 'Failed to change language')),
        )
      },

      onTypeChange: (blockId, type, language) => {
        patchBlock(blockId, { type, language }).catch((cause) =>
          setError(describe(cause, 'Failed to change block type')),
        )
      },

      onClearOutput: (blockId) => {
        setRuns((current) => {
          const next = { ...current }
          delete next[blockId]
          return next
        })
      },

      onDelete: async (blockId) => {
        try {
          await deleteBlock(blockId)
          setBlocks((current) => current.filter((block) => block.id !== blockId))
        } catch (cause) {
          setError(describe(cause, 'Failed to delete block'))
        }
      },
    }),
    [flushPending, patchBlock],
  )

  const handleInsert = useCallback(
    async (spec: InsertSpec) => {
      setInserting(true)
      setError(null)
      try {
        const block = await createBlock(stackBoxId, {
          type: spec.type,
          language: spec.language,
          content: spec.content ?? '',
          sort_order: blocksRef.current.length,
        })
        setBlocks((current) => [...current, block])
      } catch (cause) {
        setError(describe(cause, 'Failed to insert block'))
      } finally {
        setInserting(false)
      }
    },
    [stackBoxId],
  )

  /** Persists a name the title field has already accepted. */
  const handleRename = useCallback(
    async (next: string) => {
      if (!stackBox) return
      try {
        setStackBox(await updateStackBox(stackBox.id, { name: next }))
      } catch (cause) {
        setError(describe(cause, 'Failed to rename doc'))
      }
    },
    [stackBox],
  )

  /*
   * §18: the deck comes out of the document that is open, so it lives on this
   * surface as one more thing the document can do — not as a separate app with
   * its own editor.
   */
  const handleGeneratePresentation = useCallback(async () => {
    if (!stackBox) return
    setError(null)
    setNotice('Generating presentation…')

    try {
      await flushPending()
      const blob = await docToPpt(stackBox.id)
      saveBlob(blob, `${stackBox.name || 'presentation'}.pptx`)
      setNotice('Presentation downloaded')
    } catch (cause) {
      setNotice(null)
      setError(describe(cause, 'Failed to generate the presentation'))
    }
  }, [flushPending, stackBox])

  /** Summarizes the document into a new markdown block at the end. */
  const handleSummarize = useCallback(async () => {
    setError(null)
    setNotice('Summarizing…')

    try {
      await flushPending()
      const text = blocksRef.current
        .filter((block) => block.type === 'markdown')
        .map((block) => getOrCreateBlockText(doc, block.id, block.content).toString())
        .join('\n\n')
        .trim()

      if (!text) {
        setNotice(null)
        setError('There is no text to summarize yet.')
        return
      }

      const { summary } = await summarize(text)
      await handleInsert({ type: 'markdown', language: null, content: summary })
      setNotice('Summary added as a block')
    } catch (cause) {
      setNotice(null)
      setError(describe(cause, 'Failed to summarize'))
    }
  }, [doc, flushPending, handleInsert])

  /**
   * Runs every code block on the Canvas that's wired into an arrow diagram,
   * in the order the arrows define — one block at a time, so the green
   * "currently running" border (CanvasBoard.tsx) always names a single node.
   */
  const handleRunFlow = useCallback(async () => {
    setError(null)
    setFlowRunning(true)
    try {
      await flushPending()
      await canvasBoardRef.current?.runFlow()
    } catch (cause) {
      setError(describe(cause, 'Flow run failed'))
    } finally {
      setFlowRunning(false)
    }
  }, [flushPending])

  /*
   * §6: the palette gets the commands *this* Surface can perform. Registering
   * them from here (rather than a global list) is what keeps it from offering
   * actions that would silently do nothing.
   */
  useRegisterCommands(
    useMemo(
      () => [
        ...SURFACES.map((entry) => ({
          id: `surface.${entry.id}`,
          label: `Go to ${entry.label} surface`,
          group: 'Surface',
          keywords: 'switch view',
          hint: entry.id === surface ? 'current' : undefined,
          disabled: entry.id === surface,
          run: () => setSurface(entry.id),
        })),
        {
          id: 'insert.text',
          label: 'Insert text block',
          group: 'Insert',
          keywords: 'markdown new',
          run: () => handleInsert({ type: 'markdown', language: null }),
        },
        {
          id: 'insert.python',
          label: 'Insert Python block',
          group: 'Insert',
          keywords: 'code new run',
          run: () => handleInsert({ type: 'code', language: 'python' }),
        },
        {
          id: 'insert.javascript',
          label: 'Insert JavaScript block',
          group: 'Insert',
          keywords: 'code new run',
          run: () => handleInsert({ type: 'code', language: 'javascript' }),
        },
        {
          id: 'doc.rename',
          label: 'Rename this doc',
          group: 'Document',
          // Hands editing to the title itself rather than opening a dialog, so
          // the palette and a click on the title lead to the same one place.
          run: () => setRenameIntent((value) => value + 1),
        },
        {
          id: 'doc.presentation',
          label: 'Generate presentation',
          group: 'Document',
          keywords: 'ppt pptx slides deck export',
          run: handleGeneratePresentation,
        },
        {
          id: 'doc.summarize',
          label: 'Summarize this doc',
          group: 'Document',
          keywords: 'ai summary',
          run: handleSummarize,
        },
        {
          id: 'canvas.runFlow',
          label: 'Run flow',
          group: 'Canvas',
          keywords: 'diagram arrow execute sequence',
          disabled: surface !== 'canvas' || flowRunning,
          run: handleRunFlow,
        },
      ],
      [surface, flowRunning, handleInsert, handleGeneratePresentation, handleSummarize, handleRunFlow],
    ),
  )

  if (loading) {
    return <p className="sb-meta px-5 py-5 text-muted">Loading…</p>
  }

  if (!stackBox) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-3 px-8 py-10">
        <p className="sb-label text-faint">Doc</p>
        <p className="text-[19px] font-bold">{error ?? 'This doc could not be opened.'}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" onMouseMove={handleMouseMove}>
      <WorkspaceBar
        title={stackBox.name}
        surface={surface}
        onSurfaceChange={setSurface}
        peerColors={peers.map((peer) => peer.color)}
        status={connection.status}
        statusDetail={connection.detail}
        onRename={handleRename}
        renameIntent={renameIntent}
      >
        {surface === 'canvas' ? (
          /*
           * Lives in the header, not overlaid on the canvas itself: tldraw's
           * own chrome already occupies every corner (page menu, style panel,
           * toolbar, zoom), so this is the one place a StackBox control can
           * sit without competing with it.
           */
          <button
            type="button"
            onClick={handleRunFlow}
            disabled={flowRunning}
            className="sb-label border-2 border-text px-3 py-1.5 text-text transition-colors duration-100 hover:bg-sunken disabled:pointer-events-none disabled:opacity-50"
          >
            {flowRunning ? 'Running flow…' : 'Run flow'}
          </button>
        ) : (
          <span className="sb-meta text-faint">
            {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
          </span>
        )}
      </WorkspaceBar>

      {/*
       * Errors are a state of the workspace, so they belong on its edge as a
       * rule — not in a floating toast that covers the content that caused it.
       * The 4px marker is the same device the dashboard uses, so a failure reads
       * the same way wherever you meet it.
       */}
      {error && (
        <div
          role="status"
          className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-text border-l-4 border-l-danger bg-sunken px-5 py-3"
        >
          <span className="text-[15px] text-danger">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="sb-label shrink-0 pt-0.5 text-danger/70 transition-colors duration-100 hover:text-danger"
          >
            Dismiss
          </button>
        </div>
      )}

      {notice && !error && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-text bg-sunken px-5 py-2.5"
        >
          <span className="sb-meta text-muted">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="sb-label shrink-0 text-faint transition-colors duration-100 hover:text-text"
          >
            Dismiss
          </button>
        </div>
      )}

      {surface === 'canvas' ? (
        <CanvasBoard
          ref={canvasBoardRef}
          blocks={blocks}
          doc={doc}
          docHydrated={docHydrated}
          runs={runs}
          actions={actions}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/*
           * A reading measure, not a card. §12 puts typography above UI inside
           * a document, and the generous bottom space is there so the last
           * block can be worked on without sitting at the window edge.
           */}
          <div className="mx-auto w-full max-w-4xl px-8 pt-8 pb-40">
            <div className="flex justify-end pb-4">
              {/*
               * §5 Contextual UI: this menu only does things the *document*
               * can do (summarize itself, become a deck) — it stays out of
               * the shared WorkspaceBar so it never appears on the Canvas
               * surface, where neither action means anything.
               */}
              <Menu label="Document AI actions" align="right" trigger="AI">
                {(close) => (
                  <>
                    <MenuSection>AI</MenuSection>
                    <MenuItem
                      onSelect={() => {
                        void handleSummarize()
                        close()
                      }}
                    >
                      Generate summary
                    </MenuItem>
                    <MenuItem
                      onSelect={() => {
                        void handleGeneratePresentation()
                        close()
                      }}
                    >
                      Create presentation
                    </MenuItem>
                  </>
                )}
              </Menu>
            </div>

            {blocks.length === 0 && (
              <p className="pb-2 text-[17px] text-muted">
                This doc is empty. Press <kbd className="sb-key">/</kbd> below to insert a text or
                code block.
              </p>
            )}

            <ol className="flex flex-col">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  ytext={
                    docHydrated ? getOrCreateBlockText(doc, block.id, block.content) : undefined
                  }
                  run={runs[block.id]}
                  actions={actions}
                />
              ))}
            </ol>

            <BlockInserter onInsert={handleInsert} busy={inserting} />

            <DocReactions stackBoxId={stackBoxId} currentUserId={selfId} />
          </div>
        </div>
      )}
    </div>
  )
}
