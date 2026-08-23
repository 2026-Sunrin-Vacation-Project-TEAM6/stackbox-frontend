'use client'

import * as Y from 'yjs'

import { Menu, MenuItem, MenuSection, MenuSeparator } from '@/components/ui/Menu'
import { RUNNABLE_LANGUAGES, type RunState } from '@/lib/api/code'
import type { Block, BlockType } from '@/lib/api/types'
import { useYText } from '@/lib/realtime/useYText'

import { CodeBlockEditor } from './CodeBlockEditor'
import { MarkdownBlockEditor } from './MarkdownBlockEditor'

// Re-exported so the many `import { type Block } from '.../BlockEditor'` call
// sites keep working, while the shape itself has one definition (lib/api/types).
export type { Block }

/** Everything a block can do, all of it backed by an existing endpoint. */
export type BlockActions = {
  onSave: (blockId: number, content: string) => void
  onRun: (blockId: number, stdin: string | null) => void
  onLanguageChange: (blockId: number, language: string) => void
  onTypeChange: (blockId: number, type: BlockType, language: string | null) => void
  onClearOutput: (blockId: number) => void
  onDelete: (blockId: number) => void
}

/** 1-based, zero-padded. `blockLabel(0)` → "01". */
export function blockLabel(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * A block's editor, with no surrounding chrome.
 *
 * Both Surfaces (§8) render this: the document wraps it in a numbered row, the
 * Canvas wraps it in a tldraw shape. Keeping the Yjs binding and the action
 * dispatch here means the two Surfaces can never drift into behaving
 * differently for the same block.
 */
export function BlockBody({
  block,
  ytext,
  run,
  actions,
  framed = true,
}: {
  block: Block
  ytext: Y.Text | undefined
  run: RunState | undefined
  actions: BlockActions
  framed?: boolean
}) {
  const [value, onChange] = useYText(ytext, block.content)
  const save = () => actions.onSave(block.id, value)

  if (block.type === 'code') {
    return (
      <CodeBlockEditor
        language={block.language}
        value={value}
        run={run}
        framed={framed}
        onChange={onChange}
        onBlur={save}
        onRun={(stdin) => actions.onRun(block.id, stdin)}
        onLanguageChange={(language) => actions.onLanguageChange(block.id, language)}
        onClearOutput={() => actions.onClearOutput(block.id)}
        onTurnIntoText={() => actions.onTypeChange(block.id, 'markdown', null)}
        onDelete={() => actions.onDelete(block.id)}
      />
    )
  }

  return <MarkdownBlockEditor value={value} onChange={onChange} onBlur={save} />
}

/*
 * A row on the document Surface.
 *
 * §7 Composable Everything, made visible: the index in the gutter is not
 * ornament. A block is the unit that persists, runs and gets positioned on the
 * Canvas independently, and the same number labels the same block on the Canvas
 * Surface — so it is the one handle that ties §8's two Surfaces together.
 */
export function BlockEditor({
  block,
  index,
  ytext,
  run,
  actions,
}: {
  block: Block
  index: number
  ytext: Y.Text | undefined
  run: RunState | undefined
  actions: BlockActions
}) {
  return (
    /*
     * The gutter is a real column with its own rule, not an indent. The ordinal
     * was previously a 11px grey number floating in 24px of air, which read as
     * incidental — but it is the handle §7 hangs the whole block model on, so the
     * column it lives in is stated: fixed width, ink rule down the left, and the
     * number sitting against it.
     */
    <li className="group/block relative flex gap-5 border-t border-rule py-4 pr-8">
      <span className="sb-meta w-8 shrink-0 border-l-2 border-rule pt-1 pl-2 text-faint transition-colors duration-100 select-none group-hover/block:border-primary group-hover/block:text-primary">
        {blockLabel(index)}
      </span>

      <div className="min-w-0 flex-1">
        <BlockBody block={block} ytext={ytext} run={run} actions={actions} />
      </div>

      {/*
       * Text blocks get their "⋮" here, in the right margin. Code blocks carry
       * their own inside their header, next to Run — one control cluster per
       * block, positioned where that block's other controls already are.
       */}
      {block.type === 'markdown' && (
        <div className="invisible absolute top-3.5 right-0 opacity-0 transition-opacity duration-100 group-focus-within/block:visible group-focus-within/block:opacity-100 group-hover/block:visible group-hover/block:opacity-100">
          <Menu label="Text block options">
            {(close) => (
              <>
                <MenuSection>Turn into</MenuSection>
                {RUNNABLE_LANGUAGES.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    onSelect={() => {
                      actions.onTypeChange(block.id, 'code', entry.id)
                      close()
                    }}
                  >
                    {entry.label}
                  </MenuItem>
                ))}

                <MenuSeparator />
                <MenuItem
                  danger
                  onSelect={() => {
                    actions.onDelete(block.id)
                    close()
                  }}
                >
                  Delete block
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      )}
    </li>
  )
}
