'use client'

import * as Y from 'yjs'
import { useState } from 'react'

import { useYText } from '@/lib/realtime/useYText'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'

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
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch(`/blocks/${block.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: value }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (block.type === 'code') {
    return (
      <div className="space-y-2">
        <CodeBlockEditor
          blockId={block.id}
          language={block.language}
          value={value}
          onChange={onChange}
          onBlur={() => onBlur(block.id, value)}
        />
        <Button onClick={handleSave} disabled={saving} variant="secondary">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <MarkdownBlockEditor value={value} onChange={onChange} onBlur={() => onBlur(block.id, value)} />
      <Button onClick={handleSave} disabled={saving} variant="secondary">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
