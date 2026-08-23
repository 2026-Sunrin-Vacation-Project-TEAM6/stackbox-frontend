'use client'

import * as Y from 'yjs'

import { useYText } from '@/lib/realtime/useYText'

import { CodeBlockEditor } from './CodeBlockEditor'
import { MarkdownBlockEditor } from './MarkdownBlockEditor'

export type Block = {
  id: number
  stack_box_id: number
  type: 'markdown' | 'code'
  language: string | null
  content: string
  sort_order: number
  pos_x: number | null
  pos_y: number | null
  width: number | null
  height: number | null
}

export function BlockEditor({
  block,
  ytext,
  onBlur,
}: {
  block: Block
  ytext: Y.Text | undefined
  onBlur: (blockId: number, content: string) => void
}) {
  const [value, onChange] = useYText(ytext, block.content)

  if (block.type === 'code') {
    return (
      <CodeBlockEditor
        language={block.language}
        value={value}
        onChange={onChange}
        onBlur={() => onBlur(block.id, value)}
      />
    )
  }

  return (
    <MarkdownBlockEditor value={value} onChange={onChange} onBlur={() => onBlur(block.id, value)} />
  )
}
