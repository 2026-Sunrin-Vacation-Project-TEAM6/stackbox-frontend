'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Header } from '@/components/layouts/Header'
import { getAccessToken } from '@/lib/auth/token'

export default function WorkspaceLayout({
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
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  )
}
