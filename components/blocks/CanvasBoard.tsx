'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import {
  BaseBoxShapeUtil,
  Editor,
  HTMLContainer,
  T,
  Tldraw,
  createShapeId,
  type RecordProps,
  type TLBaseShape,
} from 'tldraw'
import 'tldraw/tldraw.css'
import * as Y from 'yjs'

import { apiFetch } from '@/lib/api/client'
import { getOrCreateBlockText } from '@/lib/realtime/ydoc'

import { BlockEditor, type Block } from './BlockEditor'

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    block: { blockId: number; w: number; h: number }
  }
}

const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 160
const GRID_COLUMNS = 3
const GRID_GAP = 24
const PERSIST_DEBOUNCE_MS = 500

type CanvasContextValue = {
  blocks: Block[]
  doc: Y.Doc
  docHydrated: boolean
  onBlur: (blockId: number, content: string) => void
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

type BlockShape = TLBaseShape<'block', { blockId: number; w: number; h: number }>

class BlockShapeUtil extends BaseBoxShapeUtil<BlockShape> {
  static override type = 'block' as const
  static override props: RecordProps<BlockShape> = {
    blockId: T.number,
    w: T.number,
    h: T.number,
  }

  override getDefaultProps(): BlockShape['props'] {
    return { blockId: 0, w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT }
  }

  override component(shape: BlockShape) {
    return (
      <HTMLContainer
        style={{ pointerEvents: 'all', width: shape.props.w, height: shape.props.h, overflow: 'auto' }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <BlockShapeContent blockId={shape.props.blockId} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: BlockShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function BlockShapeContent({ blockId }: { blockId: number }) {
  const context = useContext(CanvasContext)
  if (!context) return null
  const { blocks, doc, docHydrated, onBlur } = context

  const block = blocks.find((candidate) => candidate.id === blockId)
  if (!block) return null

  const ytext = docHydrated ? getOrCreateBlockText(doc, block.id, block.content) : undefined

  return (
    <div className="h-full w-full bg-white p-1 dark:bg-zinc-900">
      <BlockEditor block={block} ytext={ytext} onBlur={onBlur} />
    </div>
  )
}

function gridSlot(index: number): [number, number] {
  const column = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)
  return [column * (DEFAULT_WIDTH + GRID_GAP), row * (DEFAULT_HEIGHT + GRID_GAP)]
}

function syncShapesFromBlocks(editor: Editor, blocks: Block[]) {
  const existingBlockShapeIds = new Set(
    editor.getCurrentPageShapes().filter((shape) => shape.type === 'block').map((shape) => shape.id),
  )

  let gridIndex = 0
  for (const block of blocks) {
    const shapeId = createShapeId(`block-${block.id}`)
    if (existingBlockShapeIds.has(shapeId)) {
      existingBlockShapeIds.delete(shapeId)
      continue
    }

    const hasPosition = block.pos_x != null && block.pos_y != null
    const [x, y] = hasPosition ? [block.pos_x as number, block.pos_y as number] : gridSlot(gridIndex++)

    editor.createShape<BlockShape>({
      id: shapeId,
      type: 'block',
      x,
      y,
      props: {
        blockId: block.id,
        w: block.width ?? DEFAULT_WIDTH,
        h: block.height ?? DEFAULT_HEIGHT,
      },
    })
  }

  if (existingBlockShapeIds.size > 0) {
    editor.deleteShapes([...existingBlockShapeIds])
  }
}

export function CanvasBoard({
  blocks,
  doc,
  docHydrated,
  onBlur,
}: {
  blocks: Block[]
  doc: Y.Doc
  docHydrated: boolean
  onBlur: (blockId: number, content: string) => void
}) {
  const editorRef = useRef<Editor | null>(null)
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const editor = editorRef.current
    if (editor) syncShapesFromBlocks(editor, blocks)
  }, [blocks])

  useEffect(() => {
    return () => {
      for (const timeout of pendingPatches.current.values()) clearTimeout(timeout)
      pendingPatches.current.clear()
    }
  }, [])

  function schedulePatch(editor: Editor, shapeId: ReturnType<typeof createShapeId>) {
    const existing = pendingPatches.current.get(shapeId)
    if (existing) clearTimeout(existing)

    const timeout = setTimeout(() => {
      pendingPatches.current.delete(shapeId)
      const shape = editor.getShape<BlockShape>(shapeId)
      if (!shape) return
      apiFetch(`/blocks/${shape.props.blockId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pos_x: shape.x,
          pos_y: shape.y,
          width: shape.props.w,
          height: shape.props.h,
        }),
      }).catch(() => {})
    }, PERSIST_DEBOUNCE_MS)

    pendingPatches.current.set(shapeId, timeout)
  }

  function handleMount(editor: Editor) {
    editorRef.current = editor
    syncShapesFromBlocks(editor, blocks)

    const unlisten = editor.store.listen(
      (entry) => {
        for (const record of Object.values(entry.changes.updated)) {
          const [, next] = record
          if (next.typeName === 'shape' && next.type === 'block') {
            schedulePatch(editor, next.id)
          }
        }
        for (const record of Object.values(entry.changes.added)) {
          if (record.typeName === 'shape' && record.type === 'block') {
            schedulePatch(editor, record.id)
          }
        }
      },
      { source: 'user' },
    )

    return () => {
      editorRef.current = null
      unlisten()
    }
  }

  return (
    <CanvasContext.Provider value={{ blocks, doc, docHydrated, onBlur }}>
      <div className="h-[70vh] w-full overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
        <Tldraw shapeUtils={[BlockShapeUtil]} onMount={handleMount} />
      </div>
    </CanvasContext.Provider>
  )
}
