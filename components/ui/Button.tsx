import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

/*
 * §11: primary is rationed. It marks the one action that commits work on a
 * given surface — everything else is secondary or ghost. If two primaries end
 * up on one screen, one of them is wrong.
 *
 * Weights are deliberately uneven. A 1px hairline around a secondary reads as
 * the same generic outline button every template ships, so the structural border
 * here is 2px ink — the same weight the panels and rules use, because it is the
 * same kind of edge. Primary needs no border: a solid ink-teal block is already
 * the loudest thing on the surface.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-background hover:bg-secondary',
  secondary: 'border-2 border-text text-text hover:bg-text hover:text-background',
  ghost: 'text-muted hover:bg-sunken hover:text-text',
  danger: 'border-2 border-danger text-danger hover:bg-danger hover:text-background',
}

/*
 * Both sizes grew. `md` at 32px tall with 13px type was the floor of what a
 * pointer target should be, in a design language whose whole argument is that
 * structure should be unmissable. 40px/15px is the default; `sm` at 32px/14px is
 * for controls sitting inside a block's own header, where the block frame
 * already provides the hierarchy.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[14px]',
  md: 'h-10 px-4 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sb font-semibold whitespace-nowrap transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
