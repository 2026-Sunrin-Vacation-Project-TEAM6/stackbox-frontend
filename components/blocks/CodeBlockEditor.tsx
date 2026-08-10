'use client'

import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import CodeMirror, { type Extension } from '@uiw/react-codemirror'

const LANGUAGE_EXTENSIONS: Record<string, Extension> = {
  python: python(),
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  markdown: markdown(),
}

export function CodeBlockEditor({
  language,
  value,
  onChange,
  onBlur,
}: {
  language: string | null
  value: string
  onChange: (next: string) => void
  onBlur: () => void
}) {
  const extension = LANGUAGE_EXTENSIONS[language ?? 'python'] ?? python()

  return (
    <div className="w-full overflow-hidden rounded border border-zinc-300 text-sm dark:border-zinc-700">
      <CodeMirror
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        extensions={[extension]}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
      />
    </div>
  )
}
