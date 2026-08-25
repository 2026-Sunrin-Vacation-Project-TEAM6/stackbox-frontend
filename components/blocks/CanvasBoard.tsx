'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  BaseBoxShapeUtil,
  Editor,
  HTMLContainer,
  T,
  Tldraw,
  createShapeId,
  type RecordProps,
  type TLBaseShape,
  type TLShapeId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { useValue } from '@tldraw/state-react'
import * as Y from 'yjs'

import { apiFetch } from '@/lib/api/client'
import { isRunnable, type RunState } from '@/lib/api/code'
import { getOrCreateBlockText } from '@/lib/realtime/ydoc'

import { BlockBody, blockLabel, type Block, type BlockActions } from './BlockEditor'

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    block: { blockId: number; w: number; h: number }
  }
}

/*
 * Sized for the type that actually goes in them. At 320×160 a shape held about
 * three lines of the 17px prose scale before scrolling, which turned every
 * canvas block into a peephole; these are the smallest defaults at which a
 * paragraph or a five-line function is readable without resizing first.
 */
const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 220
const GRID_COLUMNS = 3
const GRID_GAP = 32
const PERSIST_DEBOUNCE_MS = 500

type CanvasContextValue = {
  blocks: Block[]
  doc: Y.Doc
  docHydrated: boolean
  runs: Record<number, RunState>
  actions: BlockActions
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
    const editor = this.editor
    /*
     * Only claim pointer events while the select tool is active. Every other
     * tool (arrow included) needs to hit-test and bind to this shape like any
     * other — with `pointerEvents: 'all'` unconditional, this container ate
     * every pointerdown over its bounds, so an arrow dragged to or from a
     * block never reached tldraw at all and silently failed to bind. Select
     * tool keeps the previous behavior unchanged (code editing, buttons,
     * menus all still stop propagation so they don't also trigger a
     * canvas-level drag-select).
     */
    const isSelectTool = useValue('isSelectTool', () => editor.getCurrentToolId() === 'select', [
      editor,
    ])

    return (
      <HTMLContainer
        style={{
          pointerEvents: isSelectTool ? 'all' : 'none',
          width: shape.props.w,
          height: shape.props.h,
        }}
        onPointerDown={isSelectTool ? (event) => event.stopPropagation() : undefined}
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

/*
 * A block on the Canvas. The same index it carries in the document is printed
 * in the shape's header, so moving between Surfaces (§8) never costs you track
 * of which block you are looking at.
 */
function BlockShapeContent({ blockId }: { blockId: number }) {
  const context = useContext(CanvasContext)
  if (!context) return null
  const { blocks, doc, docHydrated, runs, actions } = context

  const index = blocks.findIndex((candidate) => candidate.id === blockId)
  if (index === -1) return null
  const block = blocks[index]

  const ytext = docHydrated ? getOrCreateBlockText(doc, block.id, block.content) : undefined
  const run = runs[block.id]
  const isRunning = run?.status === 'running'
  // Same "errored" test CodeBlockEditor's OutputPanel uses for its border
  // (failed to reach the runner, or ran and exited non-zero) — the node
  // border and that panel's border are reporting the same fact.
  const isErrored = run?.status === 'failed' || (run?.status === 'done' && run.exitCode !== 0)

  return (
    /*
     * A block on the canvas is the same material as a block in the document, so
     * it carries the same 2px ink edge — a 1px hairline made every shape look
     * like a tldraw default rather than a StackBox block. The header is a sunken
     * strip for the same reason the code block's is: it names the thing without
     * competing with it.
     *
     * Running/errored borders reuse the app's two other "state" colors rather
     * than inventing a third: `border-primary` is the palette's only "active"
     * color (§10.3, also used while a flow run is on this node), and
     * `border-danger` is the same color CodeBlockEditor's own output panel
     * turns on a failed or non-zero-exit run. A finished, successful run has
     * no dedicated color anywhere else in the app either — it just goes back
     * to the resting `border-text` — so idle and success share that border.
     */
    <div
      className={`flex h-full w-full flex-col overflow-hidden border-2 bg-paper ${
        isRunning ? 'border-primary' : isErrored ? 'border-danger' : 'border-text'
      }`}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b-2 border-text bg-sunken px-2.5">
        <span className="sb-meta text-muted select-none">{blockLabel(index)}</span>
      </div>

      {/* framed={false}: this shape already draws the boundary. */}
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
        <BlockBody
          block={block}
          ytext={ytext}
          run={runs[block.id]}
          actions={actions}
          framed={false}
        />
      </div>
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

/** Exposed to the page header so its "Run flow" control lives outside the canvas's own chrome (§5, §13 — no free corner to overlay it in without colliding with tldraw's own panels). */
export type CanvasBoardHandle = {
  runFlow: () => Promise<void>
}

/**
 * Reads the arrows on the current page connecting `block` shapes and returns
 * the block ids in execution order (arrow direction = dependency order: A→B
 * means A runs before B).
 *
 * Blocks with no arrows are excluded — a "run flow" applies to the diagram
 * the user drew, not to every block on the surface. A cycle would otherwise
 * strand its members at a permanent nonzero in-degree, so any left over
 * after the topological pass are appended in id order rather than dropped.
 */
function computeFlowOrder(editor: Editor): number[] {
  const shapes = editor.getCurrentPageShapes()
  const blockIdByShapeId = new Map(
    shapes
      .filter((shape) => shape.type === 'block')
      .map((shape) => [shape.id, (shape as BlockShape).props.blockId]),
  )

  const edges: Array<[number, number]> = []
  for (const shape of shapes) {
    if (shape.type !== 'arrow') continue

    let fromShapeId: TLShapeId | undefined
    let toShapeId: TLShapeId | undefined
    for (const binding of editor.getBindingsFromShape(shape.id, 'arrow')) {
      if (binding.props.terminal === 'start') fromShapeId = binding.toId
      if (binding.props.terminal === 'end') toShapeId = binding.toId
    }
    if (!fromShapeId || !toShapeId) continue

    const fromBlockId = blockIdByShapeId.get(fromShapeId)
    const toBlockId = blockIdByShapeId.get(toShapeId)
    if (fromBlockId != null && toBlockId != null && fromBlockId !== toBlockId) {
      edges.push([fromBlockId, toBlockId])
    }
  }

  const nodes = new Set<number>()
  edges.forEach(([from, to]) => {
    nodes.add(from)
    nodes.add(to)
  })

  const adjacency = new Map<number, number[]>()
  const inDegree = new Map<number, number>()
  nodes.forEach((id) => {
    adjacency.set(id, [])
    inDegree.set(id, 0)
  })
  edges.forEach(([from, to]) => {
    adjacency.get(from)!.push(to)
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1)
  })

  const queue = [...nodes].filter((id) => inDegree.get(id) === 0).sort((a, b) => a - b)
  const order: number[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adjacency.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, remaining)
      if (remaining === 0) queue.push(next)
    }
  }

  for (const id of nodes) {
    if (!order.includes(id)) order.push(id)
  }

  return order
}

export const CanvasBoard = forwardRef<
  CanvasBoardHandle,
  {
    blocks: Block[]
    doc: Y.Doc
    docHydrated: boolean
    runs: Record<number, RunState>
    actions: BlockActions
  }
>(function CanvasBoard({ blocks, doc, docHydrated, runs, actions }, ref) {
  const editorRef = useRef<Editor | null>(null)
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useImperativeHandle(
    ref,
    () => ({
      runFlow: async () => {
        const editor = editorRef.current
        if (!editor) return
        const blockById = new Map(blocks.map((block) => [block.id, block]))
        for (const blockId of computeFlowOrder(editor)) {
          const block = blockById.get(blockId)
          // The topological order runs over every block the diagram connects,
          // markdown included, so a code block downstream of a markdown node
          // still waits its turn — but only code blocks have a "run" action,
          // so anything else is skipped rather than sent to onRun (which would
          // hit the backend and surface as a false "failed" run on a node that
          // was never runnable to begin with).
          if (!block || block.type !== 'code' || !isRunnable(block.language)) continue
          await actions.onRun(blockId, null)
        }
      },
    }),
    [actions, blocks],
  )

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
    <CanvasContext.Provider value={{ blocks, doc, docHydrated, runs, actions }}>
      {/*
       * Full-bleed, no radius, no outer border — the Canvas *is* the Surface,
       * not a widget sitting on a page (§4, §8). `sb-canvas` is the hook that
       * retargets tldraw's --tl-* tokens onto the StackBox palette.
       */}
      <div className="sb-canvas relative min-h-0 flex-1">
        <Tldraw shapeUtils={[BlockShapeUtil]} onMount={handleMount} />
      </div>
    </CanvasContext.Provider>
  )
})
