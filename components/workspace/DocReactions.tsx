'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  addReaction,
  getEmojiCatalog,
  listReactions,
  removeReaction,
  tallyReactions,
  type ReactionTally,
} from '@/lib/api/reactions'
import { isApiError } from '@/lib/api/client'
import type { EmojiCatalogEntry, Reaction } from '@/lib/api/types'

/*
 * Reactions on the document, at the end of the document.
 *
 * The catalog entries carry an `image_path` into a sticker set that is not in
 * this repo's `public/`, so the label is rendered as text. §27 wants typography
 * to carry meaning rather than icons anyway, and a broken <img> would carry
 * none. Swapping in the images later is a change to this component only.
 */
export function DocReactions({
  stackBoxId,
  currentUserId,
}: {
  stackBoxId: number
  currentUserId: number | null
}) {
  const [catalog, setCatalog] = useState<EmojiCatalogEntry[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([getEmojiCatalog(), listReactions(stackBoxId)])
      .then(([entries, current]) => {
        if (cancelled) return
        setCatalog(entries)
        setReactions(current)
      })
      // A reaction strip failing to load must not shout over the document.
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [stackBoxId])

  const toggle = useCallback(
    async (tally: ReactionTally | { code: string; ownReactionId: number | null }) => {
      setBusy(true)
      setError(null)

      try {
        if (tally.ownReactionId !== null) {
          await removeReaction(tally.ownReactionId)
          setReactions((current) =>
            current.filter((reaction) => reaction.id !== tally.ownReactionId),
          )
        } else {
          const created = await addReaction(stackBoxId, tally.code)
          setReactions((current) => [...current, created])
        }
      } catch (cause) {
        // 409 means the reaction is already there — the end state the click
        // asked for. Re-read rather than reporting a failure.
        if (isApiError(cause) && cause.status === 409) {
          setReactions(await listReactions(stackBoxId).catch(() => reactions))
        } else {
          setError(cause instanceof Error ? cause.message : 'Could not save that reaction')
        }
      } finally {
        setBusy(false)
        setPicking(false)
      }
    },
    [reactions, stackBoxId],
  )

  if (catalog.length === 0) return null

  const tallies = tallyReactions(reactions, catalog, currentUserId)
  const ownCodes = new Set(
    reactions.filter((reaction) => reaction.user_id === currentUserId).map((r) => r.emoji_code),
  )

  return (
    <div className="mt-10 border-t-2 border-text pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {tallies.map((tally) => (
          /*
           * Your own reaction is a filled primary chip, not a tinted outline. A
           * reaction you have given and one you have not are two different states
           * and should not be distinguishable only by a border color.
           */
          <button
            key={tally.code}
            type="button"
            disabled={busy}
            onClick={() => toggle(tally)}
            aria-pressed={tally.ownReactionId !== null}
            className={`inline-flex items-center gap-2 rounded-sb border-2 px-2.5 py-1 text-[14px] font-medium transition-colors duration-100 disabled:opacity-40 ${
              tally.ownReactionId !== null
                ? 'border-primary bg-primary text-background'
                : 'border-rule text-muted hover:border-text hover:text-text'
            }`}
          >
            {tally.label}
            <span className="tabular-nums">{tally.count}</span>
          </button>
        ))}

        {/* §3: the full catalog only appears once you have asked for it. */}
        {picking ? (
          <div className="flex flex-wrap items-center gap-2">
            {catalog.map((entry) => (
              <button
                key={entry.code}
                type="button"
                disabled={busy}
                onClick={() =>
                  toggle({
                    code: entry.code,
                    ownReactionId:
                      reactions.find(
                        (reaction) =>
                          reaction.emoji_code === entry.code &&
                          reaction.user_id === currentUserId,
                      )?.id ?? null,
                  })
                }
                className={`rounded-sb border-2 px-2.5 py-1 text-[14px] font-medium transition-colors duration-100 disabled:opacity-40 ${
                  ownCodes.has(entry.code)
                    ? 'border-primary bg-primary text-background'
                    : 'border-rule text-muted hover:border-text hover:text-text'
                }`}
              >
                {entry.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="sb-label px-2 py-1 text-muted transition-colors duration-100 hover:text-text"
            >
              Close
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="sb-label border-2 border-transparent px-2 py-1 text-muted transition-colors duration-100 hover:border-text hover:text-text"
          >
            React
          </button>
        )}
      </div>

      {error && <p className="pt-3 text-[15px] text-danger">{error}</p>}
    </div>
  )
}
