import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  secondary:
    'bg-transparent border border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100',
  danger: 'bg-red-600 text-white',
  ghost: 'bg-transparent text-zinc-600 dark:text-zinc-400',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded px-3 py-2 text-sm font-medium disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
