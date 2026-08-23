import { apiFetch } from '@/lib/api/client'
import type { EmojiCatalogEntry, Reaction } from '@/lib/api/types'

/**
 * `GET /emoji/catalog` — the fixed set of reactions the backend accepts.
 *
 * Anything outside this list is rejected with 400, so the picker must be built
 * from this call rather than from a hardcoded list.
 */
export function getEmojiCatalog(): Promise<EmojiCatalogEntry[]> {
  return apiFetch<EmojiCatalogEntry[]>('/emoji/catalog')
}

/** `GET /stack-boxes/{id}/reactions` — every user's reactions on the doc. */
export function listReactions(stackBoxId: number): Promise<Reaction[]> {
  return apiFetch<Reaction[]>(`/stack-boxes/${stackBoxId}/reactions`)
}

/**
 * `POST /stack-boxes/{id}/reactions`
 *
 * 409 means you already reacted with that emoji — the pair is unique per user.
 * Treat it as "already done", not as an error.
 */
export function addReaction(stackBoxId: number, emojiCode: string): Promise<Reaction> {
  return apiFetch<Reaction>(`/stack-boxes/${stackBoxId}/reactions`, {
    method: 'POST',
    body: { emoji_code: emojiCode },
  })
}

/** `DELETE /reactions/{id}` — only your own reaction; 403 otherwise. */
export function removeReaction(reactionId: number): Promise<void> {
  return apiFetch<void>(`/reactions/${reactionId}`, { method: 'DELETE' })
}

/** A reaction rolled up for display: one row per emoji, with a count. */
export type ReactionTally = {
  code: string
  label: string
  count: number
  /** The signed-in user's own reaction id, if they reacted — used to toggle off. */
  ownReactionId: number | null
}

/**
 * Groups raw reactions by emoji.
 *
 * Only emoji present in `catalog` are tallied: the catalog is the source of the
 * human-readable Korean label, and a code with no catalog entry (an emoji
 * retired between the reaction being stored and now) has nothing to render.
 */
export function tallyReactions(
  reactions: Reaction[],
  catalog: EmojiCatalogEntry[],
  currentUserId: number | null,
): ReactionTally[] {
  return catalog
    .map((entry) => {
      const matching = reactions.filter((reaction) => reaction.emoji_code === entry.code)
      const own = matching.find((reaction) => reaction.user_id === currentUserId)
      return {
        code: entry.code,
        label: entry.label,
        count: matching.length,
        ownReactionId: own?.id ?? null,
      }
    })
    .filter((tally) => tally.count > 0)
}
