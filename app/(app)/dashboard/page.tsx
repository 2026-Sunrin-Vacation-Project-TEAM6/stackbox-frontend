'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/Menu'
import { useRegisterCommands } from '@/components/workspace/CommandPalette'
import { useWorkspaces } from '@/components/workspace/WorkspaceProvider'
import {
  createStackBox,
  deleteStackBox,
  listStackBoxes,
  updateStackBox,
} from '@/lib/api/stackBoxes'
import type { StackBox, StackBoxType } from '@/lib/api/types'

/**
 * Which stack box types open as a workspace document.
 *
 * `folder` is a container in the backend's own model, so clicking one should
 * not route into an editor — it has no blocks of its own.
 */
const OPENABLE: StackBoxType[] = ['page', 'canvas', 'edgeless']

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/** Matches the block gutter in a document, so an index row and a block agree. */
function ordinal(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export default function DashboardPage() {
  const router = useRouter()

  /*
   * Which workspace you are in now belongs to the chrome, not to this page. The
   * dashboard reads it and lists that workspace's docs; switching happens in the
   * header, where it is reachable from every surface.
   */
  const {
    active,
    activeId,
    loading: loadingWorkspaces,
    error: workspaceError,
    requestCreate,
    clearError,
  } = useWorkspaces()

  const [stackBoxes, setStackBoxes] = useState<StackBox[]>([])
  const [listing, setListing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeId === null) {
      setStackBoxes([])
      return
    }

    let cancelled = false
    setListing(true)

    listStackBoxes(activeId)
      .then((data) => {
        if (!cancelled) setStackBoxes([...data].sort((a, b) => a.sort_order - b.sort_order))
      })
      .catch((cause) => {
        if (!cancelled) setError(describe(cause, 'Failed to load docs'))
      })
      .finally(() => {
        if (!cancelled) setListing(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.select()
  }, [renamingId])

  const handleCreateDoc = useCallback(
    async (type: StackBoxType) => {
      if (activeId === null) return

      setBusy(true)
      setError(null)
      try {
        const stackBox = await createStackBox({
          workspace_id: activeId,
          type,
          name: 'Untitled',
          sort_order: stackBoxes.length,
        })
        router.push(`/workspace/${stackBox.id}`)
      } catch (cause) {
        setError(describe(cause, 'Failed to create doc'))
      } finally {
        setBusy(false)
      }
    },
    [activeId, router, stackBoxes.length],
  )

  async function commitRename(stackBox: StackBox) {
    const next = renameValue.trim()
    setRenamingId(null)
    if (!next || next === stackBox.name) return

    setError(null)
    try {
      const updated = await updateStackBox(stackBox.id, { name: next })
      setStackBoxes((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
    } catch (cause) {
      setError(describe(cause, 'Failed to rename doc'))
    }
  }

  async function handleDelete(stackBox: StackBox) {
    // Deleting cascades to every block in the doc, so it gets a confirmation —
    // and one that names what is being destroyed rather than asking "are you sure?".
    if (!window.confirm(`Delete “${stackBox.name}” and all of its blocks?`)) return

    setError(null)
    try {
      await deleteStackBox(stackBox.id)
      setStackBoxes((current) => current.filter((entry) => entry.id !== stackBox.id))
    } catch (cause) {
      setError(describe(cause, 'Failed to delete doc'))
    }
  }

  useRegisterCommands(
    useMemo(
      () => [
        {
          id: 'dashboard.new-page',
          label: 'New doc',
          group: 'Create',
          keywords: 'page document',
          disabled: activeId === null,
          run: () => handleCreateDoc('page'),
        },
        {
          id: 'dashboard.new-canvas',
          label: 'New canvas doc',
          group: 'Create',
          keywords: 'draw board figjam',
          disabled: activeId === null,
          run: () => handleCreateDoc('canvas'),
        },
      ],
      [activeId, handleCreateDoc],
    ),
  )

  const shown = error ?? workspaceError

  if (loadingWorkspaces) return <p className="sb-meta px-8 py-8 text-muted">Loading…</p>

  /* The layout contributes no padding, so each surface sets its own measure. */
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-8 py-10">
      {/*
       * §25: the heading is the workspace you are actually in, not the word
       * "Dashboard" over a grid of metric cards. The subject of this screen is
       * "these are the docs in here", so it says exactly that.
       */}
      <header className="flex items-end justify-between gap-6 pb-4">
        <div className="min-w-0">
          <p className="sb-label pb-2.5 text-faint">Docs</p>
          <h1 className="truncate text-[1.875rem] leading-none font-bold tracking-[-0.025em]">
            {active?.name ?? 'No workspace'}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* Secondary paths are parked rather than competing with the one
              action that matters on this surface. */}
          <Menu label="More actions" align="right">
            {(close) => (
              <>
                <MenuItem
                  onSelect={() => {
                    close()
                    handleCreateDoc('canvas')
                  }}
                >
                  New canvas doc
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  onSelect={() => {
                    close()
                    requestCreate()
                  }}
                >
                  New workspace
                </MenuItem>
              </>
            )}
          </Menu>

          {/* §11: the one committing action here, so the one primary fill. */}
          <Button onClick={() => handleCreateDoc('page')} disabled={busy || activeId === null}>
            {busy ? 'Working…' : 'New doc'}
          </Button>
        </div>
      </header>

      {shown && (
        <div className="mb-4 flex items-start justify-between gap-4 border-l-4 border-danger bg-sunken px-4 py-3">
          <p className="text-[15px] text-danger">{shown}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              clearError()
            }}
            className="sb-label shrink-0 pt-0.5 text-danger/70 transition-colors duration-100 hover:text-danger"
          >
            Dismiss
          </button>
        </div>
      )}

      {/*
       * A ruled index, not a card grid (§19/§29). The 2px rule is the top edge of
       * the list as an object; the 1px rules inside it divide peers. Numbering
       * matches the document's own block gutter, so the two read as one system.
       */}
      <div className="border-t-2 border-text">
        {activeId === null ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-[17px]">You are not in a workspace yet.</p>
            <p className="text-[15px] text-muted">
              A workspace holds your docs, canvases and code. Create one to start writing.
            </p>
            <Button onClick={requestCreate} className="mt-1">
              New workspace
            </Button>
          </div>
        ) : listing ? (
          <p className="sb-meta py-5 text-muted">Loading docs…</p>
        ) : stackBoxes.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-[17px]">No docs in this workspace.</p>
            <p className="text-[15px] text-muted">
              A doc holds text, code blocks and a canvas on the same page.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {stackBoxes.map((stackBox, index) => {
              const openable = OPENABLE.includes(stackBox.type)
              const isRenaming = renamingId === stackBox.id

              return (
                <li
                  key={stackBox.id}
                  className="group flex items-center gap-4 border-b border-rule transition-colors duration-100 hover:bg-sunken"
                >
                  {/* Fixed gutter, so every name starts on the same axis. */}
                  <span className="sb-meta w-7 shrink-0 py-3.5 pl-1 text-faint" aria-hidden>
                    {ordinal(index)}
                  </span>

                  {isRenaming ? (
                    <form
                      className="min-w-0 flex-1 py-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        commitRename(stackBox)
                      }}
                    >
                      {/*
                       * Renaming happens in place. `window.prompt` would put the
                       * name being edited in a browser chrome dialog, away from
                       * the row it belongs to — and could not be styled to look
                       * like anything in this product.
                       */}
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => commitRename(stackBox)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setRenamingId(null)
                        }}
                        aria-label="Doc name"
                        className="w-full border-2 border-text bg-paper px-2.5 py-1.5 text-[17px] outline-none"
                      />
                    </form>
                  ) : openable ? (
                    <Link
                      href={`/workspace/${stackBox.id}`}
                      className="min-w-0 flex-1 truncate py-3.5 text-[17px] font-medium transition-colors duration-100 hover:text-primary"
                    >
                      {stackBox.name}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate py-3.5 text-[17px] text-muted">
                      {stackBox.name}
                    </span>
                  )}

                  {/* The type is information, so it is stated — not encoded in an icon. */}
                  <span className="sb-meta shrink-0 text-faint">{stackBox.type}</span>

                  {/* §3: row controls appear on approach, not permanently. Kept
                      mounted on focus-within so keyboard users can reach them. */}
                  <span className="shrink-0 pr-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100">
                    <Menu label={`Actions for ${stackBox.name}`}>
                      {(close) => (
                        <>
                          <MenuItem
                            onSelect={() => {
                              close()
                              setRenameValue(stackBox.name)
                              setRenamingId(stackBox.id)
                            }}
                          >
                            Rename
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem
                            danger
                            onSelect={() => {
                              close()
                              handleDelete(stackBox)
                            }}
                          >
                            Delete
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
