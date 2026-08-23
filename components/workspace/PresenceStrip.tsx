'use client'

const MAX_SWATCHES = 5

/*
 * §25 forbids decorative numbers, so presence is only shown because it is
 * live data the collaboration socket already provides, and because knowing
 * someone else is in the document changes how you edit it.
 *
 * Squares in each peer's own assigned color rather than avatars: the color is
 * the identity the rest of the collaboration layer uses, so reusing it here
 * keeps the signal consistent. No stacked circles, no "+3 more" bubble.
 */
export function PresenceStrip({ colors }: { colors: (string | null | undefined)[] }) {
  const visible = colors.slice(0, MAX_SWATCHES)

  return (
    <div className="flex items-center gap-2.5" aria-live="polite">
      {visible.length > 0 && (
        /*
         * Butted together into one bar rather than spaced apart, with a single
         * ink frame around the group: at 8px with 4px gaps these read as dust,
         * and the count of people in the room is worth seeing without looking.
         */
        <div className="flex items-center border-2 border-text" aria-hidden>
          {visible.map((color, index) => (
            <span
              key={index}
              className="h-4 w-3 border-l-2 border-text first:border-l-0"
              style={{ backgroundColor: color ?? 'var(--color-accent)' }}
            />
          ))}
        </div>
      )}

      {/* "here", not "editing" — the socket reports presence, not activity. */}
      <span className="sb-meta text-muted">
        {colors.length === 0 ? 'Only you' : `${colors.length + 1} here`}
      </span>
    </div>
  )
}
