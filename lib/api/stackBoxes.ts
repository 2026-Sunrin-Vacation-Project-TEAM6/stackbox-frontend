import { apiFetch } from '@/lib/api/client'
import type {
  CanvasPresence,
  DocSnapshot,
  DocUpdate,
  StackBox,
  StackBoxType,
} from '@/lib/api/types'

/** `GET /stack-boxes?workspace_id=` — flat list; nesting is via `parent_id`. */
export function listStackBoxes(workspaceId: number): Promise<StackBox[]> {
  return apiFetch<StackBox[]>(`/stack-boxes?workspace_id=${workspaceId}`)
}

/** `GET /stack-boxes/{id}` */
export function getStackBox(stackBoxId: number): Promise<StackBox> {
  return apiFetch<StackBox>(`/stack-boxes/${stackBoxId}`)
}

/** `POST /stack-boxes` — requires editor or above on the workspace. */
export function createStackBox(input: {
  workspace_id: number
  name: string
  type: StackBoxType
  parent_id?: number | null
  description?: string
  icon?: string | null
  sort_order?: number
}): Promise<StackBox> {
  return apiFetch<StackBox>('/stack-boxes', { method: 'POST', body: input })
}

/** `PATCH /stack-boxes/{id}` — requires editor or above. */
export function updateStackBox(
  stackBoxId: number,
  patch: {
    name?: string
    type?: StackBoxType
    parent_id?: number | null
    description?: string
    icon?: string | null
    sort_order?: number
  },
): Promise<StackBox> {
  return apiFetch<StackBox>(`/stack-boxes/${stackBoxId}`, { method: 'PATCH', body: patch })
}

/** `DELETE /stack-boxes/{id}` — requires admin or above; cascades to blocks. */
export function deleteStackBox(stackBoxId: number): Promise<void> {
  return apiFetch<void>(`/stack-boxes/${stackBoxId}`, { method: 'DELETE' })
}

/* ── collaborative document state ─────────────────────────────────────────── */

/**
 * `GET /stack-boxes/{id}/snapshot` — the base64 Yjs snapshot.
 *
 * 404 means "nobody has edited this document yet", which is a normal first-open
 * state, not an error; callers should treat it as an empty document.
 */
export function getSnapshot(stackBoxId: number): Promise<DocSnapshot> {
  return apiFetch<DocSnapshot>(`/stack-boxes/${stackBoxId}/snapshot`)
}

/** `PUT /stack-boxes/{id}/snapshot` — `blob`/`state` must be base64. */
export function putSnapshot(
  stackBoxId: number,
  input: { blob: string; state?: string | null },
): Promise<DocSnapshot> {
  return apiFetch<DocSnapshot>(`/stack-boxes/${stackBoxId}/snapshot`, {
    method: 'PUT',
    body: input,
  })
}

/**
 * `GET /stack-boxes/{id}/updates` — Yjs updates newer than `sinceSeq`, ordered
 * by `seq`, capped at `limit` (the backend's own default is 500).
 *
 * A full page means there may be more: keep calling with the last `seq` until a
 * short page comes back, or the document silently loads a stale prefix.
 */
export function listDocUpdates(
  stackBoxId: number,
  { sinceSeq = 0, limit = 500 }: { sinceSeq?: number; limit?: number } = {},
): Promise<DocUpdate[]> {
  return apiFetch<DocUpdate[]>(
    `/stack-boxes/${stackBoxId}/updates?since_seq=${sinceSeq}&limit=${limit}`,
  )
}

/**
 * `GET /stack-boxes/{id}/presence` — last known cursor per user.
 *
 * This is the persisted table, so it includes people who have since left. Live
 * presence comes over the WebSocket; use this only for an initial paint.
 */
export function listPresence(stackBoxId: number): Promise<CanvasPresence[]> {
  return apiFetch<CanvasPresence[]>(`/stack-boxes/${stackBoxId}/presence`)
}
