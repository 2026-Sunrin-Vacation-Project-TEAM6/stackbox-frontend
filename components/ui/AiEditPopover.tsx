'use client'

import { useState } from 'react'

function describe(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/**
 * The instruction form behind a selection's "AI" trigger.
 *
 * One control, one job: take an instruction, hand it to `onSubmit`, and let
 * the caller own what "apply" means (replacing a Markdown selection vs. a
 * CodeMirror range are different enough that this component has no opinion
 * on it). Errors surface here rather than the host editor's `error` banner —
 * a failed edit is local to the selection being worked on, not a state of
 * the whole document.
 */
export function AiEditPopover({
  onSubmit,
  onClose,
}: {
  onSubmit: (instructions: string) => Promise<void>
  onClose: () => void
}) {
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = instructions.trim()
    if (!trimmed || busy) return

    setBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (cause) {
      setError(describe(cause, 'Failed to apply the edit'))
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPointerDown={(event) => event.stopPropagation()}
      className="flex w-72 flex-col gap-2 border-2 border-text bg-paper p-2.5 shadow-hard-sm"
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
          }}
          placeholder="How should AI change this?"
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !instructions.trim()}
          className="sb-label shrink-0 bg-primary px-2.5 py-1.5 text-background transition-colors duration-100 hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
        >
          {busy ? '···' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </form>
  )
}
