'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useRegisterCommands } from '@/components/workspace/CommandPalette'
import type { Workspace } from '@/lib/api/types'
import { createWorkspace, deriveSlug, listWorkspaces } from '@/lib/api/workspaces'

/** The last workspace you looked at, so the app opens where you left it. */
const LAST_WORKSPACE_KEY = 'stackbox.last_workspace'

type WorkspaceState = {
  workspaces: Workspace[]
  active: Workspace | null
  activeId: number | null
  loading: boolean
  error: string | null
  /** Switches workspace. Leaves a doc surface, because the doc is not in it. */
  select: (workspaceId: number) => void
  /**
   * Adopts the workspace a document turns out to belong to.
   *
   * Opening a doc by URL (a shared link, a reload, browser history) says nothing
   * about which workspace the switcher was last pointed at, so the doc surface
   * reports its own `workspace_id` here. Without this, the header would name one
   * workspace while you edit a document in another.
   */
  adopt: (workspaceId: number) => void
  create: (name: string) => Promise<Workspace>
  /** Bumped by the palette's "New workspace" so the switcher opens its form. */
  createIntent: number
  requestCreate: () => void
  clearError: () => void
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

export function useWorkspaces(): WorkspaceState {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspaces must be used inside <WorkspaceProvider>')
  return context
}

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/*
 * Workspace membership is app-wide state, not dashboard state.
 *
 * It used to live in `/dashboard`, which meant the workspace you were in was
 * unknowable from any other screen and unswitchable without going back — and it
 * only surfaced at all once you had two of them. Hoisting it here is what lets
 * §8's "one workspace, several surfaces" actually hold: the chrome can name the
 * workspace on every surface, and the palette can switch from any of them.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createIntent, setCreateIntent] = useState(0)

  useEffect(() => {
    let cancelled = false

    listWorkspaces()
      .then((data) => {
        if (cancelled) return
        setWorkspaces(data)

        const remembered = Number(window.localStorage.getItem(LAST_WORKSPACE_KEY))
        const known = data.some((workspace) => workspace.id === remembered)
        setActiveId(known ? remembered : (data[0]?.id ?? null))
      })
      .catch((cause) => {
        if (!cancelled) setError(describe(cause, 'Failed to load workspaces'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeId !== null) window.localStorage.setItem(LAST_WORKSPACE_KEY, String(activeId))
  }, [activeId])

  const select = useCallback(
    (workspaceId: number) => {
      setActiveId(workspaceId)
      /*
       * A document belongs to exactly one workspace, so staying on it after
       * switching would leave the chrome describing a workspace that does not
       * contain what is on screen. The doc list of the workspace you just chose
       * is the only honest destination.
       */
      if (pathname.startsWith('/workspace/')) router.push('/dashboard')
    },
    [pathname, router],
  )

  const adopt = useCallback((workspaceId: number) => {
    setActiveId((current) => (current === workspaceId ? current : workspaceId))
  }, [])

  const create = useCallback(async (name: string) => {
    const workspace = await createWorkspace({ name, slug: deriveSlug(name) })
    setWorkspaces((current) => [...current, workspace])
    setActiveId(workspace.id)
    return workspace
  }, [])

  const requestCreate = useCallback(() => setCreateIntent((value) => value + 1), [])
  const clearError = useCallback(() => setError(null), [])

  const active = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeId) ?? null,
    [workspaces, activeId],
  )

  /*
   * §6: switching workspace is reachable from the palette on every surface, not
   * only from the screen that happens to own the control.
   */
  useRegisterCommands(
    useMemo(
      () => [
        {
          id: 'workspace.create',
          label: 'New workspace',
          group: 'Workspace',
          run: requestCreate,
        },
        ...workspaces.map((workspace) => ({
          id: `workspace.select.${workspace.id}`,
          label: `Switch to ${workspace.name}`,
          group: 'Workspace',
          keywords: 'workspace change',
          hint: workspace.id === activeId ? 'current' : undefined,
          disabled: workspace.id === activeId,
          run: () => select(workspace.id),
        })),
      ],
      [workspaces, activeId, select, requestCreate],
    ),
  )

  const value = useMemo<WorkspaceState>(
    () => ({
      workspaces,
      active,
      activeId,
      loading,
      error,
      select,
      adopt,
      create,
      createIntent,
      requestCreate,
      clearError,
    }),
    [
      workspaces,
      active,
      activeId,
      loading,
      error,
      select,
      adopt,
      create,
      createIntent,
      requestCreate,
      clearError,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
