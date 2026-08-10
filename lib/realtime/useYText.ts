import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'

import { applyTextDelta } from '@/lib/realtime/ydoc'

/** Mirrors a Y.Text into React state and routes local edits back through it as diffs. */
export function useYText(
  ytext: Y.Text | undefined,
  initialValue = ''
): [string, (next: string) => void] {
  const [value, setValue] = useState(() => ytext?.toString() ?? initialValue)

  useEffect(() => {
    if (!ytext) return
    setValue(ytext.toString())

    const onUpdate = () => setValue(ytext.toString())
    ytext.observe(onUpdate)
    return () => ytext.unobserve(onUpdate)
  }, [ytext])

  const onChange = useCallback(
    (next: string) => {
      if (!ytext) {
        setValue(next)
        return
      }
      applyTextDelta(ytext, ytext.toString(), next)
    },
    [ytext]
  )

  return [value, onChange]
}
