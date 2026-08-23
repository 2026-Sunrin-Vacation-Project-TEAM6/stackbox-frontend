'use client'

export type Surface = 'document' | 'canvas'

export const SURFACES: { id: Surface; label: string }[] = [
  { id: 'document', label: 'Document' },
  { id: 'canvas', label: 'Canvas' },
]

/*
 * §8: these are Surfaces onto one workspace, not "views" of a page and not
 * separate apps. So the control is one object with a hard frame and an internal
 * division, and moving between surfaces moves the fill inside that frame —
 * switching reads as changing position in a structure you can see.
 *
 * The active surface is a solid primary block. §10.3 names "active navigation"
 * and "selected state" as primary's job, and at two segments this is nowhere
 * near the "don't fill the screen with primary" line §11 draws. The 2px underline
 * it replaces was the problem the redesign started from: it was the correct idea
 * rendered too faintly to find.
 *
 * Still not a pill (§13) and still not a rounded segmented control — square, with
 * the frame doing the work.
 */
export function SurfaceSwitcher({
  value,
  onChange,
}: {
  value: Surface
  onChange: (surface: Surface) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace surface"
      className="flex items-stretch self-center border-2 border-text"
    >
      {SURFACES.map((surface, index) => {
        const isActive = surface.id === value
        return (
          <button
            key={surface.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(surface.id)}
            className={`sb-label flex items-center px-4 py-2.5 transition-colors duration-100 ${
              index > 0 ? 'border-l-2 border-text' : ''
            } ${
              isActive
                ? 'bg-primary text-background'
                : 'text-muted hover:bg-sunken hover:text-text'
            }`}
          >
            {surface.label}
          </button>
        )
      })}
    </div>
  )
}
