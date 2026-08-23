import { apiFetch } from '@/lib/api/client'
import type { Block, BlockType } from '@/lib/api/types'

/** `GET /stack-boxes/{id}/blocks` — ordered by `sort_order`. */
export function listBlocks(stackBoxId: number): Promise<Block[]> {
  return apiFetch<Block[]>(`/stack-boxes/${stackBoxId}/blocks`)
}

/** `POST /stack-boxes/{id}/blocks` — requires editor or above. */
export function createBlock(
  stackBoxId: number,
  input: {
    type: BlockType
    content?: string
    language?: string | null
    sort_order?: number
    pos_x?: number | null
    pos_y?: number | null
    width?: number | null
    height?: number | null
  },
): Promise<Block> {
  return apiFetch<Block>(`/stack-boxes/${stackBoxId}/blocks`, { method: 'POST', body: input })
}

/**
 * `PATCH /blocks/{id}` — requires editor or above.
 *
 * Omitted fields are left alone, so this is safe to call with just the one
 * field that changed (canvas drag sends only `pos_x`/`pos_y`).
 */
export function updateBlock(
  blockId: number,
  patch: {
    type?: BlockType
    content?: string
    language?: string | null
    sort_order?: number
    pos_x?: number | null
    pos_y?: number | null
    width?: number | null
    height?: number | null
  },
): Promise<Block> {
  return apiFetch<Block>(`/blocks/${blockId}`, { method: 'PATCH', body: patch })
}

/** `DELETE /blocks/{id}` — requires editor or above. Answers 204. */
export function deleteBlock(blockId: number): Promise<void> {
  return apiFetch<void>(`/blocks/${blockId}`, { method: 'DELETE' })
}

/** `POST /blocks/{id}/reorder` — moves the block to `sortOrder`. */
export function reorderBlock(blockId: number, sortOrder: number): Promise<Block> {
  return apiFetch<Block>(`/blocks/${blockId}/reorder`, {
    method: 'POST',
    body: { sort_order: sortOrder },
  })
}
