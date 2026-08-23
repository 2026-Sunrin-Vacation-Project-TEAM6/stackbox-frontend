'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { login, register } from '@/lib/api/auth'
import { isApiError } from '@/lib/api/client'

type Mode = 'signin' | 'register'

/**
 * Turns an auth failure into something that tells the user what to do next.
 *
 * The generic "something went wrong" is worse than useless here: a 401 on sign
 * in and a 409 on register lead to completely different next actions.
 */
function describe(cause: unknown, mode: Mode): string {
  if (isApiError(cause)) {
    if (cause.status === 401) return 'That email and password do not match an account.'
    if (cause.status === 409) return 'An account with that email already exists.'
    if (cause.status === 422) return cause.detail
    if (cause.status >= 500) return 'The server is not responding. Try again in a moment.'
    return cause.detail
  }
  return mode === 'signin' ? 'Could not sign in.' : 'Could not create the account.'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'register') await register({ email, password, name })
      else await login({ email, password })

      router.push('/dashboard')
    } catch (cause) {
      setError(describe(cause, mode))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  return (
    <div className="flex flex-col">
      <Link href="/" className="flex items-center gap-2 pb-7" aria-label="StackBox">
        <span className="sb-label-lg">STACKBOX</span>
        <span className="h-2 w-2 bg-accent" aria-hidden />
      </Link>

      {/*
       * Two modes on one surface, switched by a rule-bounded pair rather than a
       * separate /register route: the fields are almost the same, and sending
       * someone to another page to add one field is friction with no payoff.
       *
       * The selected mode is a solid primary block, not a 2px underline under
       * grey text. Which form you are filling in is the single most consequential
       * piece of state on this screen, and it should not be the faintest.
       */}
      <div className="flex items-stretch border-2 border-text">
        {(
          [
            ['signin', 'Sign in'],
            ['register', 'Create account'],
          ] as const
        ).map(([value, label], index) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            aria-current={mode === value ? 'true' : undefined}
            className={`sb-label flex-1 px-4 py-3 transition-colors duration-100 ${
              index > 0 ? 'border-l-2 border-text' : ''
            } ${
              mode === value
                ? 'bg-primary text-background'
                : 'text-muted hover:bg-sunken hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label className="flex flex-col gap-1.5 border-b border-rule py-4">
            <span className="sb-label text-muted">Name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="bg-transparent text-[17px] outline-none"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 border-b border-rule py-4">
          <span className="sb-label text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-transparent text-[17px] outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 border-b border-rule py-4">
          <span className="sb-label text-muted">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="bg-transparent text-[17px] outline-none"
          />
          {/* The backend enforces 8 characters, so state the rule up front
              rather than letting a 422 teach it after the fact. */}
          {mode === 'register' && (
            <span className="sb-meta text-faint">At least 8 characters.</span>
          )}
        </label>

        <div className="flex flex-col gap-3 pt-6">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting
              ? mode === 'register'
                ? 'Creating…'
                : 'Signing in…'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </Button>

          {/* The failure sits under the button on its own ruled strip: at 13px
              beside it, the one line telling you what to do next was the
              smallest text on the screen. */}
          {error && (
            <p className="border-l-4 border-danger bg-sunken px-3.5 py-2.5 text-[15px] text-danger">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
