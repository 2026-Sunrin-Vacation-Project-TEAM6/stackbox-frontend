'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { clearTokens } from '@/lib/auth/token'

const NAV_LINKS = [
  { href: '/docs', label: 'Docs' },
  { href: '/settings', label: 'Settings' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    clearTokens()
    router.push('/login')
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold">Stackbox</span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? 'font-medium text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <Button variant="ghost" onClick={handleLogout}>
        Sign out
      </Button>
    </header>
  )
}
