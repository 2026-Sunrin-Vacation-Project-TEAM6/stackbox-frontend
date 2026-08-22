'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Header } from '@/components/layouts/Header'
import { CommandPaletteProvider } from '@/components/workspace/CommandPalette'
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider'
import { getAccessToken } from '@/lib/auth/token'

/*
 * Chrome + client-side auth gate for every signed-in route (dashboard, github,
 * settings, workspace) — not just the workspace, which is why the group is
 * `(app)` and not `(workspace)`.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login')
      return
    }
    setAuthorized(true)
  }, [router])

  if (!authorized) return null

  return (
    /*
     * §4 Content first: the layout contributes chrome and nothing else — no
     * padding, no max-width. Each surface owns its own measure, because a
     * document wants a reading column and the Canvas wants the whole viewport.
     *
     * min-h-0 on <main> lets a surface own its scrolling instead of growing the
     * page, which is what keeps the Canvas full-bleed and the chrome fixed.
     */
    /*
     * WorkspaceProvider nests *inside* the palette provider, not beside it: it
     * registers "switch workspace" commands via useRegisterCommands, which needs
     * the palette registry to already exist above it.
     */
    <CommandPaletteProvider>
      <WorkspaceProvider>
        <div className="flex min-h-full flex-1 flex-col">
          <Header />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </WorkspaceProvider>
    </CommandPaletteProvider>
  )
}
