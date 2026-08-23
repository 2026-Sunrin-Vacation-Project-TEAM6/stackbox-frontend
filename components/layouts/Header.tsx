'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'

import { useCommandPalette, useRegisterCommands } from '@/components/workspace/CommandPalette'
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher'
import { logout } from '@/lib/api/auth'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Docs' },
  { href: '/github', label: 'GitHub' },
  { href: '/settings', label: 'Settings' },
]

/*
 * Workspace chrome, not application navigation. §8: StackBox is not
 * sidebar → page → editor, so the chrome is a single band that names where you
 * are and then gets out of the content's way.
 *
 * The band is solid ink. §30 asks for a rawer hierarchy than a hairline under a
 * pale strip, and there is a functional reason too: this is the only element on
 * screen that is never part of the document, so it should not look like it is
 * made of the same material. Inverting it means the boundary between "the app"
 * and "your content" needs no explaining.
 *
 * No icons here — §27 asks for typography and layout to carry hierarchy, and
 * three nav destinations do not need pictograms to be told apart.
 */
export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const palette = useCommandPalette()

  async function handleSignOut() {
    /*
     * `logout` revokes the refresh token server-side and clears local storage in
     * a `finally`, so a network failure still ends the session on this device —
     * which is why nothing here is conditional on it succeeding.
     */
    await logout().catch(() => undefined)
    router.push('/login')
  }

  useRegisterCommands(
    useMemo(
      () => [
        {
          id: 'nav.docs',
          label: 'Go to docs',
          group: 'Navigate',
          run: () => router.push('/dashboard'),
        },
        {
          id: 'nav.github',
          label: 'Go to GitHub import',
          group: 'Navigate',
          keywords: 'repository repo import',
          run: () => router.push('/github'),
        },
        {
          id: 'nav.settings',
          label: 'Go to settings',
          group: 'Navigate',
          run: () => router.push('/settings'),
        },
        {
          id: 'session.signout',
          label: 'Sign out',
          group: 'Session',
          run: handleSignOut,
        },
      ],
      [router]
    )
  )

  return (
    <header className="flex h-13 shrink-0 items-stretch justify-between bg-ink text-on-ink">
      <div className="flex min-w-0 items-stretch">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 border-r border-on-ink-rule px-4 transition-colors duration-100 hover:bg-white/10"
          aria-label="StackBox"
        >
          <span className="sb-label-lg">STACKBOX</span>
          {/* A mark, not an illustration: one accent square, doing the job a
              logo would. §23 rules out decorative glyphs standing in for brand. */}
          <span className="h-2 w-2 bg-accent" aria-hidden />
        </Link>

        {/*
         * The workspace sits between the product mark and the destinations
         * because it scopes them: /dashboard means "the docs in this workspace".
         */}
        <div className="flex min-w-0 items-stretch border-r border-on-ink-rule">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex items-stretch">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                /*
                 * Active state is a solid inversion of the band, not a 2px
                 * underline. On an ink surface the paper block is the highest
                 * contrast move available, and it does not depend on hue — so it
                 * survives both §11's rationing of primary and color blindness.
                 */
                className={`sb-label flex items-center px-4 transition-colors duration-100 ${
                  isActive
                    ? 'bg-on-ink text-ink'
                    : 'text-on-ink-muted hover:bg-white/10 hover:text-on-ink'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-stretch">
        {/*
         * The palette's discoverability problem solved honestly: state the
         * shortcut instead of hiding it behind a search icon.
         */}
        <button
          type="button"
          onClick={palette.open}
          className="sb-label flex items-center gap-2.5 border-l border-on-ink-rule px-4 text-on-ink-muted transition-colors duration-100 hover:bg-white/10 hover:text-on-ink"
        >
          Commands
          <kbd className="sb-key border-on-ink-rule">⌘K</kbd>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="sb-label flex items-center border-l border-on-ink-rule px-4 text-on-ink-muted transition-colors duration-100 hover:bg-white/10 hover:text-on-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
