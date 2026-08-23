import { create } from 'zustand'

export type ExecutionState = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error'

export interface ExecutionStep {
  line: number
  code: string
  variables: Record<string, unknown>
  stdout: string
  timestamp: number
}

export interface ExecutionTrace {
  blockId: number
  language: string
  totalSteps: number
  currentStep: number
  steps: ExecutionStep[]
  state: ExecutionState
  error?: string
}

interface ExecutionStore {
  traces: Map<number, ExecutionTrace>
  activeBlockId: number | null

  startExecution: (blockId: number, language: string) => void
  addStep: (blockId: number, step: ExecutionStep) => void
  completeExecution: (blockId: number) => void
  pauseExecution: (blockId: number) => void
  stopExecution: (blockId: number) => void
  setError: (blockId: number, error: string) => void
  setActiveBlock: (blockId: number | null) => void
  getTrace: (blockId: number) => ExecutionTrace | undefined
  clearTrace: (blockId: number) => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  traces: new Map(),
  activeBlockId: null,

  startExecution: (blockId: number, language: string) => {
    set((state) => {
      const traces = new Map(state.traces)
      traces.set(blockId, {
        blockId,
        language,
        totalSteps: 0,
        currentStep: 0,
        steps: [],
        state: 'running',
      })
      return { traces }
    })
  },

  addStep: (blockId: number, step: ExecutionStep) => {
    set((state) => {
      const traces = new Map(state.traces)
      const trace = traces.get(blockId)
      if (!trace) return state

      trace.steps.push(step)
      trace.currentStep = trace.steps.length
      trace.totalSteps = trace.steps.length
      return { traces }
    })
  },

  completeExecution: (blockId: number) => {
    set((state) => {
      const traces = new Map(state.traces)
      const trace = traces.get(blockId)
      if (trace) {
        trace.state = 'completed'
      }
      return { traces }
    })
  },

  pauseExecution: (blockId: number) => {
    set((state) => {
      const traces = new Map(state.traces)
      const trace = traces.get(blockId)
      if (trace) {
        trace.state = 'paused'
      }
      return { traces }
    })
  },

  stopExecution: (blockId: number) => {
    set((state) => {
      const traces = new Map(state.traces)
      const trace = traces.get(blockId)
      if (trace) {
        trace.state = 'stopped'
      }
      return { traces }
    })
  },

  setError: (blockId: number, error: string) => {
    set((state) => {
      const traces = new Map(state.traces)
      const trace = traces.get(blockId)
      if (trace) {
        trace.state = 'error'
        trace.error = error
      }
      return { traces }
    })
  },

  setActiveBlock: (blockId: number | null) => {
    set({ activeBlockId: blockId })
  },

  getTrace: (blockId: number) => {
    return get().traces.get(blockId)
  },

  clearTrace: (blockId: number) => {
    set((state) => {
      const traces = new Map(state.traces)
      traces.delete(blockId)
      return { traces }
    })
  },
}))
