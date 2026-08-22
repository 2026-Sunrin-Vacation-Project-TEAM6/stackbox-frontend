import { apiFetch } from '@/lib/api/client'
import type { CodeRun } from '@/lib/api/types'

export type { CodeRun }

/**
 * A block's most recent run, as the UI needs to show it.
 *
 * `failed` and a non-zero `exitCode` are deliberately different states: the
 * first means we never got to run the code (runner unreachable, not a code
 * block, no permission), the second means it ran and the program itself
 * failed. Collapsing them would misreport whose fault the failure is.
 */
export type RunState =
  | { status: 'running' }
  | {
      status: 'done'
      stdout: string
      stderr: string
      exitCode: number
      durationMs: number
    }
  | { status: 'failed'; message: string }

/** The languages web_worker's code_runner actually resolves an interpreter for. */
export const RUNNABLE_LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
] as const

export function isRunnable(language: string | null): boolean {
  return RUNNABLE_LANGUAGES.some((entry) => entry.id === language)
}

export function languageLabel(language: string | null): string {
  return RUNNABLE_LANGUAGES.find((entry) => entry.id === language)?.label ?? language ?? 'Text'
}

/**
 * `POST /blocks/{id}/run`
 *
 * The backend executes the block's *persisted* content, not anything sent with
 * this request, so the caller must flush the editor buffer first — otherwise
 * Run silently executes the previous revision.
 */
export function runBlock(blockId: number, stdin: string | null): Promise<CodeRun> {
  return apiFetch<CodeRun>(`/blocks/${blockId}/run`, {
    method: 'POST',
    body: { stdin: stdin || null },
  })
}

/** `GET /blocks/{id}/runs` — execution history, most useful for the last run. */
export function listRuns(blockId: number): Promise<CodeRun[]> {
  return apiFetch<CodeRun[]>(`/blocks/${blockId}/runs`)
}

export function toRunState(run: CodeRun): RunState {
  return {
    status: 'done',
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exit_code,
    durationMs: run.duration_ms,
  }
}
