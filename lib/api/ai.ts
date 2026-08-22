import { apiBlob, apiFetch } from '@/lib/api/client'
import type { ChatMessage } from '@/lib/api/types'

/*
 * Every /ai/* endpoint sits behind a per-user rate limit on the backend, which
 * answers 429. That is a "wait a moment", not a failure of the request, so UI
 * should say so rather than reporting the feature as broken.
 */

/** `POST /ai/summarize` — text is capped at 20 000 characters. */
export function summarize(text: string): Promise<{ summary: string }> {
  return apiFetch<{ summary: string }>('/ai/summarize', { method: 'POST', body: { text } })
}

/** `POST /ai/fix-code` — returns the rewritten code plus a short rationale. */
export function fixCode(input: {
  code: string
  language?: string | null
  instructions?: string | null
}): Promise<{ fixed_code: string; explanation: string }> {
  return apiFetch<{ fixed_code: string; explanation: string }>('/ai/fix-code', {
    method: 'POST',
    body: input,
  })
}

/** `POST /ai/draft` — prompt is capped at 4 000 characters. */
export function draft(prompt: string): Promise<{ draft: string }> {
  return apiFetch<{ draft: string }>('/ai/draft', { method: 'POST', body: { prompt } })
}

/** `POST /ai/chat` — the backend prepends its own system prompt. */
export function chat(messages: ChatMessage[]): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>('/ai/chat', { method: 'POST', body: { messages } })
}

/**
 * `POST /ai/doc-to-ppt` — builds a .pptx from the stack box's markdown blocks.
 *
 * Returns the file itself, not JSON. The backend reads the *persisted* blocks,
 * so unsaved editor buffers must be flushed before calling, or the deck is
 * generated from the previous revision.
 */
export function docToPpt(stackBoxId: number): Promise<Blob> {
  return apiBlob('/ai/doc-to-ppt', { method: 'POST', body: { stack_box_id: stackBoxId } })
}

/**
 * Hands a generated deck to the browser as a download.
 *
 * The object URL is revoked on the next tick rather than immediately — Safari
 * cancels the download if the URL dies in the same frame as the click.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
