'use client'

import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'

declare module '@tiptap/core' {
  interface Storage {
    markdown: {
      getMarkdown(): string
    }
  }
}

/**
 * Rich-text markdown editor bound to a plain markdown string (from useYText).
 *
 * §4/§19: no border, no card, no background of its own. Prose sits directly on
 * the workspace background and the typography in `.sb-prose` is the only
 * structure — wrapping every paragraph in a bordered box would make the
 * document look like a form.
 */
export function MarkdownBlockEditor({
  value,
  onChange,
  onBlur,
}: {
  value: string
  onChange: (next: string) => void
  onBlur: () => void
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write something…' }),
      Markdown.configure({ html: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown())
    },
    onBlur: () => onBlur(),
  })

  // Apply remote (Yjs) changes without clobbering local typing/cursor position.
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  return (
    <div className="sb-prose">
      <EditorContent editor={editor} />
    </div>
  )
}
