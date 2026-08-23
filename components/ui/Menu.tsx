'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * The "⋮" from AGENTS.md §3 — the shared mechanism for progressive disclosure.
 * A surface shows its one or two primary controls inline and parks the rest
 * here, so advanced capability stays reachable without being on screen.
 *
 * Deliberately not a floating card: square corners, a 2px ink frame, and the
 * hard offset block from §13. The offset is structure rather than decoration —
 * it states which sheet is on top using the same right angles as everything
 * else, where a soft blur would just be atmosphere (§22.1).
 */
export function Menu({
  children,
  label = 'More',
  align = 'right',
  trigger,
}: {
  children: (close: () => void) => ReactNode
  label?: string
  align?: 'left' | 'right'
  /** Overrides the default "⋮" glyph — for menus that need a named, discoverable trigger rather than a parked overflow icon (e.g. "AI"). */
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; right: number } | null>(
    null,
  )
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  /*
   * Renders through a portal into <body>, positioned from the trigger's live
   * screen coordinates rather than as a normal `position: absolute` child —
   * a code block's output panel, a canvas shape's body, and the document's
   * scroll container all clip overflow, and this panel is not "inside" any
   * of them conceptually (§13: a menu is a sheet above the page, not
   * content of the row it opened from). Recomputes on scroll/resize so it
   * stays anchored to the trigger instead of visually detaching.
   */
  useLayoutEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        right: window.innerWidth - rect.right,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      const items = panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]')
      if (!items?.length) return

      event.preventDefault()
      const list = [...items]
      const current = list.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      // Wrap, treating "nothing focused yet" as one before the first item.
      const next = (current + step + list.length + 1) % list.length
      list[next]?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        /*
         * 28px square. The old 20×16 target was smaller than the text beside it,
         * which made the one control every surface relies on for its advanced
         * capability the hardest thing on screen to hit. Open state inverts to
         * ink so the trigger reads as part of the panel it opened.
         */
        className={
          trigger
            ? `sb-label border-2 border-text px-3 py-1.5 transition-colors duration-100 ${
                open ? 'bg-text text-background' : 'text-text hover:bg-sunken'
              }`
            : `inline-flex h-7 w-7 items-center justify-center rounded-sb text-[17px] leading-none transition-colors duration-100 ${
                open ? 'bg-text text-background' : 'text-muted hover:bg-sunken hover:text-text'
              }`
        }
      >
        {trigger ?? '⋮'}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: 'fixed',
              top: position.top,
              ...(align === 'right' ? { right: position.right } : { left: position.left }),
            }}
            className="z-40 min-w-52 border-2 border-text bg-paper shadow-hard-sm"
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </span>
  )
}

export function MenuSection({ children }: { children: ReactNode }) {
  return (
    <div className="sb-label border-b border-rule bg-sunken px-3.5 py-2.5 text-muted">
      {children}
    </div>
  )
}

export function MenuItem({
  children,
  onSelect,
  checked,
  danger,
  hint,
}: {
  children: ReactNode
  onSelect: () => void
  checked?: boolean
  danger?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-menu-item
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[15px] transition-colors duration-100 hover:bg-sunken focus-visible:bg-sunken ${
        danger ? 'text-danger' : 'text-text'
      }`}
    >
      {/* Reserve the marker column so labels stay aligned whether or not the
          menu expresses selection. A filled square, not a checkmark glyph —
          selection is a state, and the square is the mark this system uses. */}
      {checked !== undefined && (
        <span
          className={`h-2.5 w-2.5 shrink-0 ${checked ? 'bg-primary' : 'border border-rule'}`}
          aria-hidden
        />
      )}
      <span className="flex-1">{children}</span>
      {hint && <span className="sb-meta shrink-0 text-faint">{hint}</span>}
    </button>
  )
}

/* Full-bleed, because the panel has no inner padding to inset it from. */
export function MenuSeparator() {
  return <div className="border-t border-rule" />
}
