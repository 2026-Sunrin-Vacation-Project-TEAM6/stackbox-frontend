'use client'

import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import CodeMirror, { type Extension } from '@uiw/react-codemirror'
import { useRef, useState } from 'react'

import { AiEditPopover } from '@/components/ui/AiEditPopover'
import { Menu, MenuItem, MenuSection, MenuSeparator } from '@/components/ui/Menu'
import { fixCode } from '@/lib/api/ai'
import {
  RUNNABLE_LANGUAGES,
  isRunnable,
  languageLabel,
  type RunState,
} from '@/lib/api/code'

/** Where the floating "AI" trigger sits, in coordinates relative to the editor wrapper. */
type SelectionAnchor = { from: number; to: number; left: number; top: number }

const LANGUAGE_EXTENSIONS: Record<string, Extension> = {
  python: python(),
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  markdown: markdown(),
}

/*
 * §17.3 / §3. The resting state is the language and the code — nothing else.
 * Run and "⋮" arrive on hover or keyboard focus; stdin and output only exist
 * once you have asked for them. Every item behind "⋮" maps to a real endpoint,
 * so the menu is not a placeholder for future capability (§24).
 *
 * Code is the one block type that keeps a border and a paper background: §12
 * requires it to be clearly separable from prose, and that distinction is
 * information, not decoration. The frame is 2px ink for the same reason it is
 * 2px everywhere else — a code block is a different material from the page it
 * sits on, and a 22%-alpha hairline was not saying so.
 */
export function CodeBlockEditor({
  language,
  value,
  run,
  framed = true,
  onChange,
  onBlur,
  onRun,
  onLanguageChange,
  onClearOutput,
  onTurnIntoText,
  onDelete,
}: {
  language: string | null
  value: string
  run: RunState | undefined
  /**
   * False when a host already draws the boundary — the Canvas shape supplies its
   * own border and paper, and nesting a second one says nothing extra (§13).
   */
  framed?: boolean
  onChange: (next: string) => void
  onBlur: () => void
  onRun: (stdin: string | null) => void
  onLanguageChange: (language: string) => void
  onClearOutput: () => void
  onTurnIntoText: () => void
  onDelete: () => void
}) {
  const [stdinOpen, setStdinOpen] = useState(false)
  const [stdin, setStdin] = useState('')
  const [outputOpen, setOutputOpen] = useState(true)
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const extension = LANGUAGE_EXTENSIONS[language ?? 'python'] ?? python()
  const runnable = isRunnable(language)
  const running = run?.status === 'running'

  /*
   * Tracks the live selection so the "AI" trigger can float next to it. Only
   * recomputed on an actual selection change (`update.selectionSet`), not
   * every keystroke — `docChanged` edits already move/collapse the selection
   * on their own and would otherwise thrash the anchor position mid-type.
   */
  function handleUpdate(update: ViewUpdate) {
    if (!update.selectionSet && !update.docChanged) return

    const { from, to, empty } = update.state.selection.main
    if (empty) {
      setSelectionAnchor(null)
      setAiOpen(false)
      return
    }

    const wrapper = wrapperRef.current
    const coords = update.view.coordsAtPos(to)
    if (!wrapper || !coords) return

    const wrapperRect = wrapper.getBoundingClientRect()
    setSelectionAnchor({
      from,
      to,
      left: coords.left - wrapperRect.left,
      top: coords.bottom - wrapperRect.top,
    })
    setAiOpen(false)
  }

  async function handleAiEdit(instructions: string) {
    const view = viewRef.current
    if (!view || !selectionAnchor) return
    const { from, to } = selectionAnchor
    const code = view.state.sliceDoc(from, to)
    if (!code.trim()) return

    const { fixed_code } = await fixCode({ code, language, instructions })
    view.dispatch({ changes: { from, to, insert: fixed_code } })
    setAiOpen(false)
    setSelectionAnchor(null)
  }

  // Once there is state worth watching, stop hiding the controls that produced
  // it — a disclosure that hides a running process is just a lost process.
  const pinned = running || run !== undefined

  return (
    <div className={`group/code ${framed ? 'rounded-sb border-2 border-text bg-paper' : ''}`}>
      <header className="flex items-center justify-between gap-3 border-b-2 border-text bg-sunken pr-2 pl-3.5">
        <span className="sb-label py-3 text-muted">{languageLabel(language)}</span>

        <div
          className={`flex items-center gap-2 transition-opacity duration-100 group-focus-within/code:visible group-focus-within/code:opacity-100 group-hover/code:visible group-hover/code:opacity-100 ${
            pinned ? 'visible opacity-100' : 'invisible opacity-0'
          }`}
        >
          {runnable && (
            /*
             * The one action a code block exists for, so it gets the solid
             * primary fill (§10.3) rather than being a text link the same size as
             * the language label beside it.
             */
            <button
              type="button"
              onClick={() => onRun(stdinOpen ? stdin : null)}
              disabled={running}
              className="flex items-center gap-2 rounded-sb bg-primary px-3 py-1.5 text-[14px] font-semibold text-background transition-colors duration-100 hover:bg-secondary disabled:opacity-50"
            >
              {running ? 'Running…' : 'Run'}
              {!running && <span aria-hidden>▶</span>}
            </button>
          )}

          <Menu label="Code block options">
            {(close) => (
              <>
                <MenuSection>Language</MenuSection>
                {RUNNABLE_LANGUAGES.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    checked={language === entry.id}
                    onSelect={() => {
                      onLanguageChange(entry.id)
                      close()
                    }}
                  >
                    {entry.label}
                  </MenuItem>
                ))}

                <MenuSeparator />
                <MenuItem
                  onSelect={() => {
                    setStdinOpen((current) => !current)
                    close()
                  }}
                >
                  {stdinOpen ? 'Hide input' : 'Add input'}
                </MenuItem>
                <MenuItem
                  onSelect={() => {
                    onClearOutput()
                    close()
                  }}
                >
                  Clear output
                </MenuItem>

                <MenuSeparator />
                <MenuItem
                  onSelect={() => {
                    onTurnIntoText()
                    close()
                  }}
                >
                  Turn into text
                </MenuItem>
                <MenuItem
                  danger
                  onSelect={() => {
                    onDelete()
                    close()
                  }}
                >
                  Delete block
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>

      <div ref={wrapperRef} className="sb-code relative">
        <CodeMirror
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onUpdate={handleUpdate}
          onCreateEditor={(view) => {
            viewRef.current = view
          }}
          extensions={[extension]}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
        />

        {selectionAnchor && (
          <div
            className="absolute z-10"
            style={{ left: selectionAnchor.left, top: selectionAnchor.top + 4 }}
          >
            {aiOpen ? (
              <AiEditPopover onSubmit={handleAiEdit} onClose={() => setAiOpen(false)} />
            ) : (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setAiOpen(true)}
                className="sb-label border-2 border-text bg-paper px-3 py-2 text-text shadow-hard-sm transition-colors duration-100 hover:bg-sunken"
              >
                AI
              </button>
            )}
          </div>
        )}
      </div>

      {stdinOpen && (
        <div className="border-t-2 border-text px-3.5 py-3">
          <label className="sb-label mb-2 block text-muted">Input</label>
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            rows={2}
            placeholder="Passed to the program as stdin"
            className="w-full resize-y bg-transparent font-mono text-[15px] outline-none placeholder:text-faint"
          />
        </div>
      )}

      {run && (
        <OutputPanel run={run} open={outputOpen} onToggle={() => setOutputOpen((v) => !v)} />
      )}
    </div>
  )
}

function OutputPanel({
  run,
  open,
  onToggle,
}: {
  run: RunState
  open: boolean
  onToggle: () => void
}) {
  const errored = run.status === 'failed' || (run.status === 'done' && run.exitCode !== 0)

  return (
    /*
     * Output is the result of the code above it, so the seam between them is a
     * real 2px edge — and when a run failed, that edge is the danger marker. The
     * status is stated in words next to it; §14 rules out a spinner standing in
     * for information we already have.
     */
    <div className={`border-t-2 ${errored ? 'border-danger' : 'border-text'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 hover:bg-sunken"
      >
        <span className={`sb-label ${errored ? 'text-danger' : 'text-muted'}`}>Output</span>

        <span className="sb-meta flex items-center gap-3 text-faint">
          {run.status === 'running' && 'running…'}
          {run.status === 'failed' && <span className="text-danger">not run</span>}
          {run.status === 'done' && (
            <>
              {run.exitCode !== 0 && <span className="text-danger">exit {run.exitCode}</span>}
              <span>{run.durationMs}ms</span>
            </>
          )}
          <span className="text-[15px] leading-none" aria-hidden>
            {open ? '−' : '+'}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-rule px-3.5 py-3">
          {run.status === 'running' && <p className="sb-meta text-muted">Waiting for the runner…</p>}

          {run.status === 'failed' && (
            <p className="font-mono text-[15px] whitespace-pre-wrap text-danger">{run.message}</p>
          )}

          {run.status === 'done' && (
            <>
              {run.stdout && (
                <pre className="font-mono text-[15px] leading-relaxed whitespace-pre-wrap">
                  {run.stdout}
                </pre>
              )}
              {run.stderr && (
                <pre className="font-mono text-[15px] leading-relaxed whitespace-pre-wrap text-danger">
                  {run.stderr}
                </pre>
              )}
              {!run.stdout && !run.stderr && <p className="sb-meta text-faint">No output.</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
