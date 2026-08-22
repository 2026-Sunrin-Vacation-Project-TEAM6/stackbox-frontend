'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { GithubConnection } from '@/components/features/GithubConnection'
import { importFiles, listContents, listRepos } from '@/lib/api/github'
import { listStackBoxes } from '@/lib/api/stackBoxes'
import type { GithubContent, GithubRepo, StackBox, Workspace } from '@/lib/api/types'
import { listWorkspaces } from '@/lib/api/workspaces'

const IMPORTABLE_TYPES = new Set(['page', 'canvas', 'edgeless'])

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/** `owner/name` — the only stable key for a repo across pages of results. */
function repoKey(repo: GithubRepo): string {
  return repo.full_name
}

export default function GithubPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [connected, setConnected] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [repo, setRepo] = useState<GithubRepo | null>(null)
  const [path, setPath] = useState('')
  const [contents, setContents] = useState<GithubContent[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targets, setTargets] = useState<StackBox[]>([])
  const [targetId, setTargetId] = useState<number | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The backend's OAuth callback lands here with ?connected=1. Say so, then
  // drop the parameter so a reload doesn't repeat a stale confirmation.
  useEffect(() => {
    if (searchParams.get('connected') !== '1') return
    setNotice('GitHub account connected.')
    router.replace('/github')
  }, [router, searchParams])

  const loadRepos = useCallback(async () => {
    try {
      setRepos(await listRepos())
    } catch (cause) {
      setError(describe(cause, 'Failed to load repositories'))
    }
  }, [])

  useEffect(() => {
    if (connected) void loadRepos()
  }, [connected, loadRepos])

  // Import needs a destination doc, so gather every doc the user can write to.
  useEffect(() => {
    if (!connected) return
    let cancelled = false

    listWorkspaces()
      .then(async (workspaces: Workspace[]) => {
        const perWorkspace = await Promise.all(
          workspaces.map((workspace) => listStackBoxes(workspace.id).catch(() => [])),
        )
        if (cancelled) return
        const openable = perWorkspace.flat().filter((box) => IMPORTABLE_TYPES.has(box.type))
        setTargets(openable)
        setTargetId((current) => current ?? openable[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load docs to import into')
      })

    return () => {
      cancelled = true
    }
  }, [connected])

  const browse = useCallback(
    async (target: GithubRepo, nextPath: string) => {
      setBrowsing(true)
      setError(null)
      try {
        const items = await listContents(target.owner, target.name, nextPath)
        // Directories first, then files — each alphabetical, so a deep repo is
        // navigable without hunting.
        setContents(
          [...items].sort((a, b) => {
            if ((a.type === 'dir') !== (b.type === 'dir')) return a.type === 'dir' ? -1 : 1
            return a.name.localeCompare(b.name)
          }),
        )
        setPath(nextPath)
      } catch (cause) {
        setError(describe(cause, 'Failed to read that path'))
      } finally {
        setBrowsing(false)
      }
    },
    [],
  )

  function openRepo(next: GithubRepo) {
    setRepo(next)
    setSelected(new Set())
    void browse(next, '')
  }

  function toggle(filePath: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }

  async function handleImport() {
    if (!repo || targetId === null || selected.size === 0) return

    setImporting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await importFiles({
        owner: repo.owner,
        repo: repo.name,
        paths: [...selected],
        stack_box_id: targetId,
      })
      setSelected(new Set())
      setNotice(
        `Imported ${result.imported} ${result.imported === 1 ? 'file' : 'files'} as blocks.`,
      )
    } catch (cause) {
      setError(describe(cause, 'Failed to import'))
    } finally {
      setImporting(false)
    }
  }

  /** Path segments, so any ancestor directory is one click away. */
  const crumbs = path ? path.split('/') : []

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-8 py-8">
      <span className="sb-label text-faint">Import</span>
      <h1 className="pt-1.5 text-[1.875rem] leading-none font-bold tracking-[-0.025em]">GitHub</h1>

      <div className="pt-8">
        <GithubConnection onStatusChange={setConnected} />
      </div>

      {notice && (
        <p className="border-l-4 border-primary bg-sunken px-4 py-3 text-[15px]">{notice}</p>
      )}
      {error && (
        <div className="flex items-center justify-between gap-4 border-l-4 border-danger bg-sunken px-4 py-3">
          <p className="text-[15px] text-danger">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="sb-label shrink-0 text-danger hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {connected === false && (
        <p className="pt-5 text-[17px] text-muted">
          Connect an account to browse repositories and import files as blocks.
        </p>
      )}

      {connected && !repo && (
        <section className="pt-8">
          <h2 className="sb-label border-b-2 border-text pb-2.5 text-muted">Repositories</h2>

          {repos === null ? (
            <p className="pt-4 text-[15px] text-muted">Loading…</p>
          ) : repos.length === 0 ? (
            <p className="pt-4 text-[15px] text-muted">
              This account has no repositories the token can read.
            </p>
          ) : (
            <ul className="flex flex-col">
              {repos.map((entry) => (
                <li key={repoKey(entry)} className="border-b border-rule">
                  <button
                    type="button"
                    onClick={() => openRepo(entry)}
                    className="group flex w-full items-center gap-4 py-3.5 text-left transition-colors duration-100 hover:bg-sunken"
                  >
                    {/* The marker is the affordance: hovering a row lights the
                        bar that says "this one opens". */}
                    <span
                      className="h-5 w-1 shrink-0 bg-transparent transition-colors duration-100 group-hover:bg-primary"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[17px] font-medium">
                      {entry.full_name}
                    </span>
                    {/* Private is a fact about the repo, so it is stated once. */}
                    {entry.private && <span className="sb-meta shrink-0 text-faint">private</span>}
                    <span className="sb-meta shrink-0 pr-4 text-faint">{entry.default_branch}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {connected && repo && (
        <section className="pt-8">
          <div className="flex items-center justify-between gap-4 border-b-2 border-text pb-2.5">
            <div className="flex min-w-0 items-baseline gap-2.5 text-[15px]">
              <button
                type="button"
                onClick={() => {
                  setRepo(null)
                  setContents([])
                  setPath('')
                  setSelected(new Set())
                }}
                className="sb-label text-muted hover:text-text"
              >
                Repositories
              </button>
              <span className="text-faint">/</span>
              <button
                type="button"
                onClick={() => browse(repo, '')}
                className="truncate font-medium hover:text-primary"
              >
                {repo.full_name}
              </button>

              {crumbs.map((segment, index) => (
                <span key={`${segment}-${index}`} className="flex items-baseline gap-2.5">
                  <span className="text-faint">/</span>
                  <button
                    type="button"
                    onClick={() => browse(repo, crumbs.slice(0, index + 1).join('/'))}
                    className="truncate hover:text-primary"
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </div>

            {selected.size > 0 && (
              <span className="sb-label shrink-0 bg-primary px-2.5 py-1 text-background">
                {selected.size} selected
              </span>
            )}
          </div>

          {browsing ? (
            <p className="pt-4 text-[15px] text-muted">Loading…</p>
          ) : contents.length === 0 ? (
            <p className="pt-4 text-[15px] text-muted">This directory is empty.</p>
          ) : (
            <ul className="flex flex-col">
              {contents.map((item) =>
                item.type === 'dir' ? (
                  <li key={item.path} className="border-b border-rule">
                    <button
                      type="button"
                      onClick={() => browse(repo, item.path)}
                      className="group flex w-full items-center gap-4 py-3 text-left transition-colors duration-100 hover:bg-sunken"
                    >
                      <span
                        className="h-5 w-1 shrink-0 bg-transparent transition-colors duration-100 group-hover:bg-primary"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[17px]">{item.name}</span>
                      <span className="sb-meta shrink-0 pr-4 text-faint">directory</span>
                    </button>
                  </li>
                ) : (
                  <li key={item.path} className="border-b border-rule">
                    {/*
                     * A square that fills with primary when checked, not the
                     * browser's own checkbox: at 13px the native control was the
                     * only rounded, OS-styled element on the page, and selection
                     * here is the state the import depends on.
                     */}
                    <label className="flex cursor-pointer items-center gap-4 py-3 transition-colors duration-100 hover:bg-sunken">
                      <input
                        type="checkbox"
                        checked={selected.has(item.path)}
                        onChange={() => toggle(item.path)}
                        className="peer sr-only"
                      />
                      <span
                        className={`ml-0.5 h-4 w-4 shrink-0 border-2 border-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                          selected.has(item.path) ? 'bg-primary' : 'bg-transparent'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[17px]">{item.name}</span>
                    </label>
                  </li>
                ),
              )}
            </ul>
          )}

          {/*
           * §5: the import controls only exist once something is selected —
           * before that there is nothing to import and no destination to pick.
           */}
          {selected.size > 0 && (
            /*
             * The bar that commits the work gets the weight of the work: a 2px
             * ink frame on paper, sitting under the list it acts on, rather than
             * three 13px controls floating in the page margin.
             */
            <div className="mt-6 flex flex-wrap items-center gap-5 border-2 border-text bg-paper px-5 py-4">
              <label className="flex items-center gap-3">
                <span className="sb-label text-muted">Import into</span>
                <select
                  value={targetId ?? ''}
                  onChange={(event) => setTargetId(Number(event.target.value))}
                  className="rounded-sb border-2 border-text bg-transparent px-2.5 py-1.5 text-[15px] font-medium"
                >
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </label>

              <Button onClick={handleImport} disabled={importing || targetId === null}>
                {importing ? 'Importing…' : `Import ${selected.size}`}
              </Button>

              {targets.length === 0 && (
                <span className="text-[15px] text-danger">
                  Create a doc first — imported files become blocks inside one.
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
