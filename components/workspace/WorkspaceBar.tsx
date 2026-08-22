'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { RealtimeStatus } from '@/lib/realtime/socket'

import { PresenceStrip } from './PresenceStrip'
import { SurfaceSwitcher, type Surface } from './SurfaceSwitcher'

/*
 * Only the states worth interrupting someone for. There is deliberately no
 * "Connected" chip: a permanent green badge confirming that the normal case is
 * normal is exactly the decoration §24 rules out, and the presence strip already
 * shows collaboration working. This band stays quiet until it has something to
 * report.
 */
const STATUS_TEXT: Partial<Record<RealtimeStatus, string>> = {
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Not syncing',
}

/*
 * The workspace's own band: what you are in, which Surface you are on, and who
 * else is here. Everything else about the document lives on the content itself
 * (§5 Contextual UI) rather than being hoisted into a permanent toolbar (§4).
 */
export function WorkspaceBar({
  title,
  surface,
  onSurfaceChange,
  peerColors,
  status,
  statusDetail,
  onRename,
  renameIntent = 0,
  children,
}: {
  title: string
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  peerColors: (string | null | undefined)[]
  status?: RealtimeStatus
  statusDetail?: string | null
  onRename?: (next: string) => void
  /** Bumped by the palette's "Rename this doc" so the title becomes editable. */
  renameIntent?: number
  children?: ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renameIntent === 0 || !onRename) return
    setDraft(title)
    setEditing(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameIntent])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== title) onRename?.(next)
  }

  const statusText = status ? STATUS_TEXT[status] : undefined

  return (
    /*
     * A 2px ink rule, not a hairline. This is the boundary between the chrome and
     * the document, which is the most important edge on the screen — §13 says
     * borders carry region separation, and a 14%-alpha line was not carrying it.
     */
    <div className="flex shrink-0 items-center justify-between gap-6 border-b-2 border-text px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        {editing ? (
          <form
            className="min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              commit()
            }}
          >
            {/*
             * The title is edited where it is displayed. `window.prompt` put the
             * document's name in an OS dialog with a different typeface, away
             * from the thing being renamed — and made the one piece of text most
             * worth direct manipulation the one piece you could not touch.
             */}
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEditing(false)
              }}
              aria-label="Doc name"
              className="w-full border-2 border-text bg-paper px-2.5 py-1 text-[19px] font-bold tracking-[-0.02em] outline-none"
            />
          </form>
        ) : onRename ? (
          <button
            type="button"
            onClick={() => {
              setDraft(title)
              setEditing(true)
            }}
            title="Rename"
            className="max-w-[46ch] truncate border-b-2 border-transparent text-left text-[19px] font-bold tracking-[-0.02em] transition-colors duration-100 hover:border-accent"
          >
            {title}
          </button>
        ) : (
          <h1 className="max-w-[46ch] truncate text-[19px] font-bold tracking-[-0.02em]">
            {title}
          </h1>
        )}

        {children}
      </div>

      <div className="flex shrink-0 items-center gap-5">
        {statusText && (
          <span
            className="sb-label flex items-center gap-2 text-muted"
            title={statusDetail ?? undefined}
            role="status"
          >
            {/* Hollow square while it may still recover, solid danger once it
                will not. State, not a spinner (§28). */}
            <span
              className={`h-2.5 w-2.5 shrink-0 ${
                status === 'offline' ? 'bg-danger' : 'border-2 border-accent'
              }`}
              aria-hidden
            />
            {statusText}
          </span>
        )}

        <PresenceStrip colors={peerColors} />
        <SurfaceSwitcher value={surface} onChange={onSurfaceChange} />
      </div>
    </div>
  )
}
