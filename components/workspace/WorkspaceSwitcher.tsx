'use client'

import { useEffect, useRef, useState } from 'react'

import { useWorkspaces } from '@/components/workspace/WorkspaceProvider'

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/*
 * Which workspace you are in, stated permanently in the chrome.
 *
 * §3 would ordinarily park a control like this behind ⌘K, but "which workspace
 * am I editing in" is not a capability to be disclosed on demand — it is the
 * answer to a question the user has to be able to check before typing. So the
 * *name* is always visible and only the *list* is progressive.
 *
 * Deliberately not an avatar-plus-chevron account chip (§19/§27): the workspace
 * name in the system voice, with one square marker, is the whole control.
 */
export function WorkspaceSwitcher() {
  const { workspaces, active, activeId, loading, select, create, createIntent } = useWorkspaces()

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setOpen(false)
    setCreating(false)
    setName('')
    setError(null)
  }

  // The palette's "New workspace" lands here rather than in a second dialog, so
  // there is exactly one place in the app where a workspace gets made.
  useEffect(() => {
    if (createIntent === 0) return
    setOpen(true)
    setCreating(true)
  }, [createIntent])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) reset()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        reset()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      const items = panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-workspace-item]')
      if (!items?.length) return

      event.preventDefault()
      const list = [...items]
      const current = list.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      // Wrap, treating "nothing focused yet" as one before the first item.
      list[(current + step + list.length + 1) % list.length]?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return

    setBusy(true)
    setError(null)
    try {
      await create(trimmed)
      reset()
    } catch (cause) {
      setError(describe(cause, 'Failed to create workspace'))
    } finally {
      setBusy(false)
    }
  }

  const label = loading ? 'Loading…' : (active?.name ?? 'No workspace')

  return (
    <div ref={rootRef} className="relative flex items-stretch">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? reset() : setOpen(true))}
        className={`flex max-w-56 items-center gap-2.5 px-4 text-left transition-colors duration-100 ${
          open ? 'bg-on-ink text-ink' : 'text-on-ink hover:bg-white/10'
        }`}
      >
        {/* One square, in primary, marking the live workspace. Not an icon. */}
        <span
          className={`h-2.5 w-2.5 shrink-0 ${open ? 'bg-primary' : 'bg-accent'}`}
          aria-hidden
        />
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{label}</span>
        <span className="sb-meta shrink-0 opacity-60" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Workspaces"
          /*
           * The panel drops off the ink band onto the application surface, so it
           * returns to the light palette. §13: the hard offset block is the layer
           * cue — a real sheet above the page, in the same square vocabulary.
           */
          className="absolute top-full left-0 z-40 mt-1 w-80 border-2 border-text bg-paper shadow-hard-sm"
        >
          <div className="sb-label border-b-2 border-text px-3.5 py-2.5 text-muted">Workspace</div>

          {workspaces.length === 0 ? (
            <p className="px-3.5 py-3 text-[14px] text-muted">
              You are not in a workspace yet.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {workspaces.map((workspace) => {
                const isActive = workspace.id === activeId
                return (
                  <li key={workspace.id} className="border-b border-rule last:border-b-0">
                    <button
                      type="button"
                      role="menuitem"
                      data-workspace-item
                      disabled={isActive}
                      onClick={() => {
                        reset()
                        select(workspace.id)
                      }}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 ${
                        isActive ? 'bg-sunken' : 'hover:bg-sunken'
                      }`}
                    >
                      {/* Marker column, reserved so names stay aligned. */}
                      <span
                        className={`h-2.5 w-2.5 shrink-0 ${
                          isActive ? 'bg-primary' : 'border border-rule-strong'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                        {workspace.name}
                      </span>
                      {isActive && <span className="sb-meta shrink-0 text-faint">current</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t-2 border-text">
            {creating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2.5 p-3.5">
                <label className="sb-label text-muted" htmlFor="new-workspace-name">
                  New workspace
                </label>
                {/*
                 * An inline field, not `window.prompt`. A browser prompt is
                 * unstyleable, blocks the tab, and cannot show the error the
                 * backend returns — which is the one thing this form has to do.
                 */}
                <input
                  ref={inputRef}
                  id="new-workspace-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Team name"
                  disabled={busy}
                  className="w-full border-2 border-text bg-background px-2.5 py-2 text-[15px] text-text outline-none placeholder:text-faint disabled:opacity-50"
                />

                {error && <p className="text-[14px] text-danger">{error}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy || !name.trim()}
                    className="h-9 shrink-0 bg-primary px-3.5 text-[14px] font-semibold text-background transition-colors duration-100 hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
                  >
                    {busy ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false)
                      setName('')
                      setError(null)
                    }}
                    className="h-9 px-2.5 text-[14px] text-muted transition-colors duration-100 hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                data-workspace-item
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 hover:bg-sunken"
              >
                <span className="w-2.5 shrink-0 text-center text-[15px] leading-none" aria-hidden>
                  +
                </span>
                <span className="text-[15px] font-medium">New workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
