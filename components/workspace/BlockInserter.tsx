'use client'

import { useMemo, useRef, useState } from 'react'

export type InsertSpec = {
  type: 'markdown' | 'code'
  language: string | null
  content?: string
}

type Option = {
  /** What the user types after the slash. */
  token: string
  label: string
  describe: string
  spec: InsertSpec
}

/*
 * Only what the stack can actually do: the code runner (web_worker) resolves
 * python and javascript and rejects everything else, so offering more here
 * would be advertising a failure.
 */
const OPTIONS: Option[] = [
  {
    token: 'text',
    label: 'Text',
    describe: 'Markdown, headings, lists',
    spec: { type: 'markdown', language: null },
  },
  {
    token: 'python',
    label: 'Python',
    describe: 'Runnable code block',
    spec: { type: 'code', language: 'python' },
  },
  {
    token: 'javascript',
    label: 'JavaScript',
    describe: 'Runnable code block',
    spec: { type: 'code', language: 'javascript' },
  },
]

/*
 * §3/§6: replaces a permanent "Add block" button. At rest this is one line of
 * faint text stating the interaction; the menu only exists once you have
 * committed to inserting something by typing "/".
 *
 * Typing anything that isn't a command is treated as prose and becomes a text
 * block, so the fast path (just start writing) never requires the menu.
 */
export function BlockInserter({
  onInsert,
  busy,
}: {
  onInsert: (spec: InsertSpec) => void
  busy?: boolean
}) {
  const [value, setValue] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isCommand = value.startsWith('/')
  const query = isCommand ? value.slice(1).trim().toLowerCase() : ''

  const matches = useMemo(() => {
    if (!isCommand) return []
    if (!query) return OPTIONS
    return OPTIONS.filter(
      (option) => option.token.startsWith(query) || option.label.toLowerCase().startsWith(query)
    )
  }, [isCommand, query])

  function reset() {
    setValue('')
    setActive(0)
  }

  function commit(spec: InsertSpec) {
    reset()
    onInsert(spec)
    // Keep focus here: inserting several blocks in a row is the common case.
    inputRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      reset()
      inputRef.current?.blur()
      return
    }

    if (isCommand && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      if (!matches.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + matches.length) % matches.length)
      return
    }

    if (event.key !== 'Enter') return
    event.preventDefault()

    if (isCommand) {
      const option = matches[active]
      if (option) commit(option.spec)
      return
    }

    const text = value.trim()
    if (text) commit({ type: 'markdown', language: null, content: text })
  }

  return (
    <div className="relative">
      {/* Aligned to the same gutter the blocks use, so the next line you type
          sits exactly where the block it becomes will sit. */}
      <div className="flex items-baseline gap-5 border-t border-rule pt-4">
        <span
          className="sb-meta w-8 shrink-0 border-l-2 border-transparent pl-2 text-faint select-none"
          aria-hidden
        >
          ··
        </span>
        <input
          ref={inputRef}
          value={value}
          disabled={busy}
          onChange={(event) => {
            setValue(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder={busy ? 'Inserting…' : 'Type / to insert, or start writing'}
          aria-label="Insert a block"
          className="w-full bg-transparent py-1 text-[17px] outline-none placeholder:text-faint disabled:opacity-50"
        />
      </div>

      {isCommand && (
        <div className="absolute left-13 z-20 mt-1.5 min-w-80 border-2 border-text bg-paper shadow-hard-sm">
          {matches.length === 0 ? (
            <p className="px-3.5 py-3 text-[15px] text-muted">No block type matches “{query}”.</p>
          ) : (
            matches.map((option, index) => (
              <button
                key={option.token}
                type="button"
                onMouseMove={() => setActive(index)}
                onClick={() => commit(option.spec)}
                className={`flex w-full items-center gap-3.5 border-b border-rule px-3.5 py-2.5 text-left last:border-b-0 ${
                  index === active ? 'bg-sunken' : ''
                }`}
              >
                {/* A solid primary bar, filling the row's full height — the same
                    "selection is a block of primary" rule as everywhere else. */}
                <span
                  className={`h-5 w-1 shrink-0 ${
                    index === active ? 'bg-primary' : 'bg-transparent'
                  }`}
                  aria-hidden
                />
                <span className="flex-1 text-[15px] font-medium">{option.label}</span>
                <span className="sb-meta shrink-0 text-faint">{option.describe}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
