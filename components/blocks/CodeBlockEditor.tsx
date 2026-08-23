'use client'

import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import CodeMirror, { type Extension } from '@uiw/react-codemirror'
import { useState } from 'react'

import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { useExecutionStore } from '@/lib/execution/execution-context'

const LANGUAGE_EXTENSIONS: Record<string, Extension> = {
  python: python(),
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  markdown: markdown(),
}

type CodeRunResult = {
  id: number
  stdout: string
  stderr: string
  exit_code: number
  duration_ms: number
}

export function CodeBlockEditor({
  language,
  value,
  onChange,
  onBlur,
  blockId,
}: {
  language: string | null
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  blockId?: number
}) {
  const extension = LANGUAGE_EXTENSIONS[language ?? 'python'] ?? python()
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<CodeRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set())

  const { startExecution, completeExecution, setError: setStoreError, setActiveBlock } =
    useExecutionStore()

  async function handleRun() {
    if (!blockId) return
    setExecuting(true)
    setError(null)
    startExecution(blockId, language ?? 'python')

    try {
      const run = await apiFetch<CodeRunResult>(`/blocks/${blockId}/run`, {
        method: 'POST',
        body: JSON.stringify({ stdin: '' }),
      })
      setResult(run)

      // Highlight all lines with code
      const lines = value.split('\n')
      const highlighted = new Set<number>()
      lines.forEach((line, idx) => {
        if (line.trim()) highlighted.add(idx + 1)
      })
      setHighlightedLines(highlighted)

      completeExecution(blockId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute code'
      setError(errorMsg)
      setStoreError(blockId, errorMsg)
    } finally {
      setExecuting(false)
    }
  }

  function handleStepClick(lineNum: number) {
    setActiveBlock(blockId ?? null)
  }

  const lines = value.split('\n')

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-full space-y-1">
          {/* Code editor with line tracking */}
          <div className="overflow-hidden rounded border border-zinc-300 text-sm dark:border-zinc-700">
            <CodeMirror
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              extensions={[extension]}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />
          </div>

          {/* Line execution indicator */}
          {highlightedLines.size > 0 && (
            <div className="flex flex-wrap gap-1 text-xs">
              {lines.map((line, idx) => {
                if (!line.trim()) return null
                const lineNum = idx + 1
                const isHighlighted = highlightedLines.has(lineNum)
                return (
                  <button
                    key={idx}
                    onClick={() => handleStepClick(lineNum)}
                    className={`rounded px-2 py-1 transition-colors ${
                      isHighlighted
                        ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    L{lineNum}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {blockId && (
          <Button onClick={handleRun} disabled={executing} variant="secondary">
            {executing ? 'Running…' : '▶ Run'}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="rounded border border-zinc-300 bg-zinc-50 p-2 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <div className="font-semibold text-zinc-700 dark:text-zinc-300">
            Output ({result.duration_ms}ms)
          </div>
          {result.stdout && (
            <pre className="overflow-auto whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {result.stdout}
            </pre>
          )}
          {result.stderr && (
            <pre className="overflow-auto whitespace-pre-wrap text-red-600 dark:text-red-400">
              {result.stderr}
            </pre>
          )}
          {result.exit_code !== 0 && (
            <p className="text-red-600 dark:text-red-400">Exit code: {result.exit_code}</p>
          )}
        </div>
      )}
    </div>
  )
}
