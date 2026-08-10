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

/** Rich-text markdown editor bound to a plain markdown string (from useYText). */
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
    <div className="w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-700 [&_.tiptap]:min-h-24 [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-zinc-400 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]">
      <EditorContent editor={editor} />
    </div>
  )
}
