'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getAccessToken } from '@/lib/auth/token'

/**
 * "Open workspace" for a signed-in visitor, "Sign in" otherwise.
 *
 * Resolved after mount because the token lives in localStorage, which the
 * server cannot see. It renders the signed-out label first so the markup is
 * never empty — a link that appears out of nowhere reads as a layout bug.
 */
export function SessionLink({ className = '' }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    setSignedIn(Boolean(getAccessToken()))
  }, [])

  return (
    <Link href={signedIn ? '/dashboard' : '/login'} className={className}>
      {signedIn ? 'Open workspace' : 'Sign in'}
    </Link>
  )
}
