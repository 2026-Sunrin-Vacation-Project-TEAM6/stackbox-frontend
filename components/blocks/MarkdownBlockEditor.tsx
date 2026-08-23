'use client'

import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import { Markdown } from 'tiptap-markdown'

import { editText } from '@/lib/api/ai'
import { AiEditPopover } from '@/components/ui/AiEditPopover'

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
  const [aiOpen, setAiOpen] = useState(false)

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
    onSelectionUpdate: () => setAiOpen(false),
  })

  // Apply remote (Yjs) changes without clobbering local typing/cursor position.
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  /*
   * The instruction targets the *range that was selected when the button was
   * pressed*, not "wherever the selection is by the time the AI responds" —
   * typing into the popover's input steals editor focus, which would
   * otherwise move or collapse the selection out from under the edit.
   */
  async function handleEdit(instructions: string) {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selected = editor.state.doc.textBetween(from, to, '\n')
    if (!selected.trim()) return

    const { edited_text } = await editText({ text: selected, instructions })
    editor.chain().focus().insertContentAt({ from, to }, edited_text).run()
    setAiOpen(false)
  }

  return (
    <div className="sb-prose">
      {editor && (
        <BubbleMenu editor={editor}>
          {aiOpen ? (
            <AiEditPopover onSubmit={handleEdit} onClose={() => setAiOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              onPointerDown={(event) => event.stopPropagation()}
              className="sb-label border-2 border-text bg-paper px-3 py-2 text-text shadow-hard-sm transition-colors duration-100 hover:bg-sunken"
            >
              AI
            </button>
          )}
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
