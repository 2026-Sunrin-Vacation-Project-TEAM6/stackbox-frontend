import * as Y from 'yjs'

import { apiFetch } from '@/lib/api/client'
import { sendDocUpdate } from '@/lib/realtime/socket'

// Origin markers let doc.on('update') tell apart local edits (broadcast + persist)
// from updates that were merely applied while hydrating or relaying (must not re-broadcast).
export const LOCAL_ORIGIN = Symbol('stackbox-local')
const HYDRATE_ORIGIN = Symbol('stackbox-hydrate')
const REMOTE_ORIGIN = Symbol('stackbox-remote')

const UPDATES_PAGE_SIZE = 500

type DocSnapshotRead = {
  blob: string
  version: number
}

type DocUpdateRead = {
  blob: string
  seq: number
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Loads the compacted snapshot (if any) plus every update recorded after it,
 * replaying them onto `doc` in seq order. Safe to call on an empty doc — a
 * missing snapshot (404) or empty update log are both treated as "nothing to load".
 */
export async function hydrateDoc(doc: Y.Doc, stackBoxId: number): Promise<void> {
  let sinceSeq = 0

  try {
    const snapshot = await apiFetch<DocSnapshotRead>(`/stack-boxes/${stackBoxId}/snapshot`)
    Y.applyUpdate(doc, base64ToBytes(snapshot.blob), HYDRATE_ORIGIN)
  } catch {
    // no snapshot yet — start from an empty doc
  }

  while (true) {
    const updates = await apiFetch<DocUpdateRead[]>(
      `/stack-boxes/${stackBoxId}/updates?since_seq=${sinceSeq}&limit=${UPDATES_PAGE_SIZE}`
    )
    for (const update of updates) {
      Y.applyUpdate(doc, base64ToBytes(update.blob), HYDRATE_ORIGIN)
      sinceSeq = update.seq
    }
    if (updates.length < UPDATES_PAGE_SIZE) break
  }
}

/**
 * Wires local edits to the socket: any doc change made under LOCAL_ORIGIN is
 * encoded and sent as a doc_update frame. Updates applied via hydrateDoc or
 * applyRemoteUpdate are ignored so peers' own edits never get echoed back.
 */
export function attachDocBroadcast(doc: Y.Doc, socket: WebSocket): () => void {
  const onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== LOCAL_ORIGIN) return
    if (socket.readyState !== WebSocket.OPEN) return
    sendDocUpdate(socket, bytesToBase64(update))
  }
  doc.on('update', onUpdate)
  return () => doc.off('update', onUpdate)
}

export function applyRemoteUpdate(doc: Y.Doc, blob: string): void {
  Y.applyUpdate(doc, base64ToBytes(blob), REMOTE_ORIGIN)
}

/**
 * Compacts history into a single snapshot so future hydrateDoc calls don't
 * have to replay every update ever made. Safe to call opportunistically
 * (e.g. on unmount) — failures are non-fatal since the update log remains intact.
 */
export async function pushSnapshot(doc: Y.Doc, stackBoxId: number): Promise<void> {
  const blob = bytesToBase64(Y.encodeStateAsUpdate(doc))
  const state = bytesToBase64(Y.encodeStateVector(doc))
  await apiFetch(`/stack-boxes/${stackBoxId}/snapshot`, {
    method: 'PUT',
    body: JSON.stringify({ blob, state }),
  })
}

/** Gets or creates the shared Y.Text for a block, seeding it from `initialContent` if new. */
export function getOrCreateBlockText(doc: Y.Doc, blockId: number, initialContent: string): Y.Text {
  const blocks = doc.getMap<Y.Text>('blocks')
  const key = String(blockId)
  const existing = blocks.get(key)
  if (existing) return existing

  const text = new Y.Text()
  if (initialContent) text.insert(0, initialContent)
  doc.transact(() => {
    blocks.set(key, text)
  }, LOCAL_ORIGIN)
  return text
}

/**
 * Applies a plain-text edit (from a textarea's onChange) as a minimal
 * delete+insert range on the shared Y.Text, instead of blindly replacing the
 * whole string — this keeps concurrent edits to the same block mergeable
 * instead of last-write-wins.
 */
export function applyTextDelta(ytext: Y.Text, previous: string, next: string): void {
  if (previous === next) return

  const maxPrefix = Math.min(previous.length, next.length)
  let start = 0
  while (start < maxPrefix && previous[start] === next[start]) start++

  const maxSuffix = Math.min(previous.length - start, next.length - start)
  let end = 0
  while (
    end < maxSuffix &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++
  }

  const deleteLength = previous.length - start - end
  const insertText = next.slice(start, next.length - end)

  const doc = ytext.doc
  const apply = () => {
    if (deleteLength > 0) ytext.delete(start, deleteLength)
    if (insertText.length > 0) ytext.insert(start, insertText)
  }
  if (doc) doc.transact(apply, LOCAL_ORIGIN)
  else apply()
}
