'use client'

import { useEffect, useState } from 'react'

import * as Y from 'yjs'

import { applyTextDelta } from './ydoc'

/**
 * React hook that syncs a Y.Text instance with local state.
 *
 * Returns [value, onChange] where:
 * - value: the current string content of the Y.Text
 * - onChange: a handler that applies text edits as minimal deltas
 *
 * When ytext is undefined, falls back to the initialContent as a plain string.
 */
export function useYText(
  ytext: Y.Text | undefined,
  initialContent: string
): [string, (next: string) => void] {
  const [value, setValue] = useState(initialContent)

  useEffect(() => {
    if (!ytext) {
      setValue(initialContent)
      return
    }

    // Initialize from Y.Text if available
    setValue(ytext.toString())

    // Subscribe to Y.Text changes
    const handler = () => setValue(ytext.toString())
    ytext.observe(handler)

    return () => ytext.unobserve(handler)
  }, [ytext, initialContent])

  const onChange = (next: string) => {
    if (ytext) {
      applyTextDelta(ytext, value, next)
    } else {
      setValue(next)
    }
  }

  return [value, onChange]
}
