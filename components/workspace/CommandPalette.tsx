'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/*
 * §6 Command-driven interaction / §20: the palette is how capability gets
 * discovered without being displayed. It is a registry rather than a fixed
 * list — whichever surface is mounted contributes the commands it can actually
 * perform, so the palette never advertises an action that would no-op.
 */
export type Command = {
  id: string
  /** Command name, sentence case. This is the searchable label. */
  label: string
  /** Coarse bucket used as a section heading. Keep to a handful. */
  group: string
  run: () => void
  /** Rendered right-aligned — a real shortcut, or short state like "current". */
  hint?: string
  /** Extra search terms that shouldn't appear in the label. */
  keywords?: string
  disabled?: boolean
}

type Registry = {
  open: () => void
  close: () => void
  register: (commands: Command[]) => () => void
}

const CommandContext = createContext<Registry | null>(null)

export function useCommandPalette(): Registry {
  const context = useContext(CommandContext)
  if (!context) throw new Error('useCommandPalette must be used inside <CommandPaletteProvider>')
  return context
}

/**
 * Publishes `commands` to the palette for as long as the calling component is
 * mounted. Pass a memoized array (or accept the re-register on every change).
 */
export function useRegisterCommands(commands: Command[]) {
  const { register } = useCommandPalette()
  useEffect(() => register(commands), [register, commands])
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Keyed by registration so unmounting a surface withdraws exactly its own
  // commands, and ordering stays stable across re-registers.
  const [sources, setSources] = useState<Map<number, Command[]>>(new Map())
  const nextKey = useRef(0)

  const register = useCallback((commands: Command[]) => {
    const key = nextKey.current++
    setSources((current) => new Map(current).set(key, commands))
    return () => {
      setSources((current) => {
        const next = new Map(current)
        next.delete(key)
        return next
      })
    }
  }, [])

  const value = useMemo<Registry>(
    () => ({ register, open: () => setOpen(true), close: () => setOpen(false) }),
    [register]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const commands = useMemo(() => [...sources.values()].flat(), [sources])

  return (
    <CommandContext.Provider value={value}>
      {children}
      {open && <Palette commands={commands} onClose={() => setOpen(false)} />}
    </CommandContext.Provider>
  )
}

function Palette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const available = commands.filter((command) => !command.disabled)
    if (!needle) return available
    return available.filter((command) =>
      `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase().includes(needle)
    )
  }, [commands, query])

  // Any change to the result set invalidates the highlighted row.
  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!matches.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + matches.length) % matches.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = matches[active]
      if (!command) return
      onClose()
      command.run()
    }
  }

  let lastGroup: string | null = null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/*
       * Flat scrim. §22.1 rules out backdrop-blur as a design language, and a
       * blurred workspace behind a command list communicates nothing extra.
       */}
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-text/35"
      />

      {/*
       * The palette is the most-used surface in the product (§6/§20), so it is
       * sized to be used rather than to be tidy: a 640px sheet with a 2px frame
       * and the hard offset, sitting on the scrim as a physical object.
       */}
      <div className="relative flex max-h-[64vh] w-full max-w-2xl flex-col border-2 border-text bg-paper shadow-hard">
        <div className="flex items-center gap-3 border-b-2 border-text px-4 py-3.5">
          <span className="sb-label shrink-0 text-muted">Run</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands"
            className="w-full bg-transparent text-[17px] outline-none placeholder:text-faint"
          />
          <kbd className="sb-key shrink-0 border-rule text-muted">esc</kbd>
        </div>

        <div ref={listRef} className="overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-4 py-3.5 text-[15px] text-muted">No command matches “{query}”.</p>
          ) : (
            matches.map((command, index) => {
              const showGroup = command.group !== lastGroup
              lastGroup = command.group

              return (
                <div key={command.id}>
                  {showGroup && (
                    <div className="sb-label border-y border-rule bg-sunken px-4 py-2.5 text-muted">
                      {command.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => {
                      onClose()
                      command.run()
                    }}
                    className={`flex w-full items-center gap-4 px-4 py-2.5 text-left text-[15px] ${
                      index === active ? 'bg-sunken' : ''
                    }`}
                  >
                    {/* Position marker rather than a color-only active state. */}
                    <span
                      className={`h-5 w-1 shrink-0 ${
                        index === active ? 'bg-primary' : 'bg-transparent'
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1">{command.label}</span>
                    {command.hint && (
                      <span className="sb-meta shrink-0 text-faint">{command.hint}</span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
