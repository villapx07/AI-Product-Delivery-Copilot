'use client'

/**
 * useWorkbench — primary hook for the workbench page.
 * All state lives here so page.tsx stays thin.
 *
 * Responsibilities:
 *  - Per-module generation with elapsed-timer
 *  - Per-module state (idle/generating/saved/error/missing_prereq)
 *  - Generating modal (blurred overlay) during generation — ALL modules
 *  - Autosave of discovery inputs
 *  - Artifact CRUD (add/edit/delete) for all module types
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { artifactsApi } from '@/lib/api'
import type { ModuleName, ModuleState } from '@/hooks/useGeneration'
import type { Epic } from '@/components/outputs/EpicMap'
import type { UserStory } from '@/components/outputs/UserStories'

// ── Module config ────────────────────────────────────────────────────────────

const MODULE_KEY_MAP: Record<ModuleName, string> = {
  'Epic Map': 'epic_map',
  'User Stories': 'user_stories',
  'QA Scenarios': 'qa_scenarios',
  'Analytics': 'analytics',
  'Risks': 'risks',
  'Review': 'reviewer',
}

const PREREQUISITES: Record<ModuleName, ModuleName[]> = {
  'Epic Map': [],
  'User Stories': ['Epic Map'],
  'QA Scenarios': ['User Stories'],
  'Analytics': ['User Stories'],
  'Risks': ['Epic Map', 'User Stories'],
  'Review': ['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks'],
}

const DEFAULT_STATES = (): Record<ModuleName, ModuleState> => ({
  'Epic Map':     { status: 'idle', data: null, updatedAt: null, error: null },
  'User Stories': { status: 'idle', data: null, updatedAt: null, error: null },
  'QA Scenarios': { status: 'idle', data: null, updatedAt: null, error: null },
  'Analytics':   { status: 'idle', data: null, updatedAt: null, error: null },
  'Risks':       { status: 'idle', data: null, updatedAt: null, error: null },
  'Review':      { status: 'idle', data: null, updatedAt: null, error: null },
})

// ── Types ────────────────────────────────────────────────────────────────────

interface UseWorkbenchOptions {
  workbenchId: string
  workbench: Record<string, unknown>
  initialArtifacts?: Array<{ artifact_type: string; content_json: string }>
}

export interface UseWorkbenchReturn {
  moduleStates: Record<ModuleName, ModuleState>
  activeTab: ModuleName
  autosaveStatus: 'idle' | 'saving' | 'saved'
  generatingModal: ModuleName | null
  elapsedSeconds: number

  setActiveTab: (tab: ModuleName) => void
  updateModuleState: (module: ModuleName, partial: Partial<ModuleState>) => void

  // Generation — elapsed timer managed inside, blur overlay shown for ALL modules
  generateModule: (module: ModuleName) => Promise<void>
  regenerateModule: (module: ModuleName) => Promise<void>

  // Epic
  addEpic: (epic: Epic) => void
  deleteEpic: (epicId: string) => void

  // User Story
  addStory: (epicId: string) => void
  deleteStory: (storyId: string) => void

  // QA Scenarios
  addScenario: (type: 'positive' | 'negative' | 'edge' | 'validation') => void
  deleteScenario: (id: string) => void
  editScenario: (id: string, field: string, value: string) => void

  // Analytics
  addEvent: () => void
  deleteEvent: (id: string) => void
  editEvent: (id: string, field: string, value: string) => void

  // Risks
  addRisk: () => void
  deleteRisk: (id: string) => void
  editRisk: (id: string, field: string, value: string | boolean) => void

  // Autosave
  triggerAutosave: (inputs: Record<string, unknown>) => void
  clearAutosaveStatus: () => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkbench({ workbenchId, workbench, initialArtifacts = [] }: UseWorkbenchOptions): UseWorkbenchReturn {
  const [moduleStates, setModuleStates] = useState<Record<ModuleName, ModuleState>>(DEFAULT_STATES)
  const [activeTab, setActiveTab] = useState<ModuleName>('Epic Map')
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [generatingModal, setGeneratingModal] = useState<ModuleName | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationStartRef = useRef<number | null>(null)

  // Restore saved artifacts on mount
  useEffect(() => {
    if (!initialArtifacts || initialArtifacts.length === 0) return

    setModuleStates((s) => {
      const next = { ...s }
      for (const a of initialArtifacts) {
        const tab = Object.keys(MODULE_KEY_MAP).find(
          (tab) => MODULE_KEY_MAP[tab as ModuleName] === a.artifact_type
        ) as ModuleName | undefined
        if (tab) {
          // Backend stores content as content_json (string); parse it for the UI
          const parsedData = a.content_json ? JSON.parse(a.content_json) : null
          next[tab] = { status: 'saved', data: parsedData, updatedAt: new Date().toISOString(), error: null }
        }
      }
      return next
    })
  }, [initialArtifacts])

  // ── Timer helpers ─────────────────────────────────────────────────────────

  // Use a ref so the interval always reads the current module, not a stale closure.
  const generatingRef = useRef<ModuleName | null>(null)

  const startTimer = useCallback((module: ModuleName) => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    generationStartRef.current = Date.now()
    setElapsedSeconds(0)
    generatingRef.current = module
    setGeneratingModal(module)

    elapsedTimerRef.current = setInterval(() => {
      if (generationStartRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - generationStartRef.current) / 1000))
      }
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    generationStartRef.current = null
    generatingRef.current = null
    setGeneratingModal(null)
  }, [])

  // ── Module state helpers ───────────────────────────────────────────────────

  const updateModuleState = useCallback((module: ModuleName, partial: Partial<ModuleState>) => {
    setModuleStates((s) => ({ ...s, [module]: { ...s[module], ...partial } }))
  }, [])

  // ── SSE parsing + fetch ───────────────────────────────────────────────────

  /**
   * Parse raw SSE text and return parsed data + error.
   * Handles multi-line SSE blocks: event: module_data / data: {"user_stories": [...]}
   * and single JSON fallback.
   */
  const parseSSE = useCallback((text: string, moduleKey: string): { parsedData: unknown; error: string | null } => {
    const blocks = text.split('\n\n')
    for (const block of blocks) {
      const lines = block.split('\n')
      let eventType = ''
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim()
          continue  // move to next line to get the data: value
        }
        if (!line.startsWith('data:')) continue
        dataLine = line.slice(5).trim()
        if (!dataLine || !eventType) continue
        try {
          const parsed = JSON.parse(dataLine)
          if (eventType === 'prerequisite_missing') {
            return { parsedData: null, error: `Generate ${parsed} first` }
          }
          if (eventType === 'error') {
            return { parsedData: null, error: String(parsed) }
          }
          // module_data events carry {"user_stories": [...]} — extract by key match
          if (eventType === 'module_data' && parsed && typeof parsed === 'object') {
            for (const key of Object.keys(parsed)) {
              if (moduleKey === key || moduleKey.includes(key) || key.includes(moduleKey)) {
                return { parsedData: parsed[key], error: null }
              }
            }
          }
          // Direct key lookup
          if (parsed && typeof parsed === 'object' && moduleKey in parsed) {
            return { parsedData: parsed[moduleKey], error: null }
          }
        } catch {
          // skip non-JSON
        }
      }
    }

    // Fallback: single JSON object
    try {
      const parsed = JSON.parse(text.trim())
      if (parsed && typeof parsed === 'object' && moduleKey in parsed) {
        return { parsedData: parsed[moduleKey], error: null }
      }
    } catch {
      // not JSON
    }

    return { parsedData: null, error: null }
  }, [])

  const saveArtifact = useCallback(async (moduleKey: string, data: unknown) => {
    await artifactsApi.save(workbenchId, {
      artifact_type: moduleKey,
      content_json: JSON.stringify(data),
    })
  }, [workbenchId])

  const doGenerate = useCallback(async (module: ModuleName, regenerate: boolean) => {
    const moduleKey = MODULE_KEY_MAP[module]

    let res: Response
    try {
      res = await fetch('/api/generate/modular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ workbench_id: workbenchId, module: moduleKey, regenerate }),
      })
    } catch (err) {
      updateModuleState(module, { status: 'error', error: (err as Error)?.message || 'Network error' })
      stopTimer()
      return
    }

    if (!res.ok) {
      const errText = await res.text()
      updateModuleState(module, { status: 'error', error: `Generation failed: ${res.status} — ${errText}` })
      stopTimer()
      return
    }

    const text = await res.text()
    const { parsedData, error } = parseSSE(text, moduleKey)

    if (error) {
      updateModuleState(module, { status: 'error', error })
      stopTimer()
      return
    }

    if (parsedData !== null) {
      await saveArtifact(moduleKey, parsedData)
      updateModuleState(module, { status: 'saved', data: parsedData, updatedAt: new Date().toISOString(), error: null })
    } else {
      // Parse succeeded but no data found — still save as empty to avoid re-generating
      await saveArtifact(moduleKey, [])
      updateModuleState(module, { status: 'saved', data: [], updatedAt: new Date().toISOString(), error: null })
    }
    stopTimer()
  }, [workbenchId, parseSSE, saveArtifact, updateModuleState, stopTimer])

  // ── Generation ─────────────────────────────────────────────────────────────

  const generateModule = useCallback(async (module: ModuleName) => {
    for (const p of PREREQUISITES[module]) {
      const pState = moduleStates[p]
      if (!pState || pState.status !== 'saved') {
        updateModuleState(module, { status: 'missing_prereq', error: `Generate ${p} first` })
        return
      }
    }

    updateModuleState(module, { status: 'generating', error: null })
    startTimer(module)
    await doGenerate(module, false)
  }, [moduleStates, updateModuleState, startTimer, doGenerate])

  const regenerateModule = useCallback(async (module: ModuleName) => {
    updateModuleState(module, { status: 'generating', error: null })
    startTimer(module)
    await doGenerate(module, true)
  }, [startTimer, doGenerate, updateModuleState])

  // ── Epic ───────────────────────────────────────────────────────────────────

  const addEpic = useCallback((newEpic: Epic) => {
    setModuleStates((s) => {
      const current = (s['Epic Map'].data as Epic[]) || []
      const next = [...current, newEpic]
      saveArtifact('epic_map', next)
      return { ...s, 'Epic Map': { ...s['Epic Map'], data: next } }
    })
  }, [saveArtifact])

  const deleteEpic = useCallback((epicId: string) => {
    setModuleStates((s) => {
      const current = (s['Epic Map'].data as Epic[]) || []
      const next = current.filter((e) => e.id !== epicId)
      saveArtifact('epic_map', next)
      return { ...s, 'Epic Map': { ...s['Epic Map'], data: next } }
    })
  }, [saveArtifact])

  // ── User Story ─────────────────────────────────────────────────────────────

  const addStory = useCallback((epicId: string) => {
    const newStory: UserStory = {
      id: `story-${Date.now()}`,
      epicId: epicId || 'General',
      user: 'User',
      goal: 'Goal',
      benefit: 'Benefit',
      criteria: [],
    }
    setModuleStates((s) => {
      const current = (s['User Stories'].data as UserStory[]) || []
      const next = [...current, newStory]
      saveArtifact('user_stories', next)
      return { ...s, 'User Stories': { ...s['User Stories'], data: next } }
    })
  }, [saveArtifact])

  const deleteStory = useCallback((storyId: string) => {
    setModuleStates((s) => {
      const current = (s['User Stories'].data as UserStory[]) || []
      const next = current.filter((st) => st.id !== storyId)
      saveArtifact('user_stories', next)
      return { ...s, 'User Stories': { ...s['User Stories'], data: next } }
    })
  }, [saveArtifact])

  // ── QA Scenarios ────────────────────────────────────────────────────────────

  const addScenario = useCallback((type: 'positive' | 'negative' | 'edge' | 'validation') => {
    const newScenario = {
      id: `qa-${Date.now()}`,
      title: 'New Scenario',
      type,
      preconditions: 'Pre-conditions...',
      steps: 'Steps...',
      expectedResult: 'Expected result...',
    }
    setModuleStates((s) => {
      const current = (s['QA Scenarios'].data as unknown[]) || []
      const next = [...current, newScenario]
      saveArtifact('qa_scenarios', next)
      return { ...s, 'QA Scenarios': { ...s['QA Scenarios'], data: next } }
    })
  }, [saveArtifact])

  const deleteScenario = useCallback((id: string) => {
    setModuleStates((s) => {
      const current = (s['QA Scenarios'].data as unknown[]) || []
      const next = current.filter((item: any) => item.id !== id)
      saveArtifact('qa_scenarios', next)
      return { ...s, 'QA Scenarios': { ...s['QA Scenarios'], data: next } }
    })
  }, [saveArtifact])

  const editScenario = useCallback((id: string, field: string, value: string) => {
    setModuleStates((s) => {
      const current = (s['QA Scenarios'].data as any[]) || []
      const next = current.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
      saveArtifact('qa_scenarios', next)
      return { ...s, 'QA Scenarios': { ...s['QA Scenarios'], data: next } }
    })
  }, [saveArtifact])

  // ── Analytics ───────────────────────────────────────────────────────────────

  const addEvent = useCallback(() => {
    const newEvent = {
      id: `event-${Date.now()}`,
      eventName: 'new_event',
      trigger: 'Trigger...',
      purpose: 'Purpose...',
      funnelStage: 'awareness',
    }
    setModuleStates((s) => {
      const current = (s['Analytics'].data as unknown[]) || []
      const next = [...current, newEvent]
      saveArtifact('analytics', next)
      return { ...s, 'Analytics': { ...s['Analytics'], data: next } }
    })
  }, [saveArtifact])

  const deleteEvent = useCallback((id: string) => {
    setModuleStates((s) => {
      const current = (s['Analytics'].data as unknown[]) || []
      const next = current.filter((item: any) => item.id !== id)
      saveArtifact('analytics', next)
      return { ...s, 'Analytics': { ...s['Analytics'], data: next } }
    })
  }, [saveArtifact])

  const editEvent = useCallback((id: string, field: string, value: string) => {
    setModuleStates((s) => {
      const current = (s['Analytics'].data as any[]) || []
      const next = current.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
      saveArtifact('analytics', next)
      return { ...s, 'Analytics': { ...s['Analytics'], data: next } }
    })
  }, [saveArtifact])

  // ── Risks ───────────────────────────────────────────────────────────────────

  const addRisk = useCallback(() => {
    const newRisk = {
      id: `risk-${Date.now()}`,
      text: 'New risk...',
      type: 'technical',
      severity: 'medium' as const,
      checked: false,
      suggestedAction: 'Suggested action...',
    }
    setModuleStates((s) => {
      const current = (s['Risks'].data as unknown[]) || []
      const next = [...current, newRisk]
      saveArtifact('risks', next)
      return { ...s, 'Risks': { ...s['Risks'], data: next } }
    })
  }, [saveArtifact])

  const deleteRisk = useCallback((id: string) => {
    setModuleStates((s) => {
      const current = (s['Risks'].data as unknown[]) || []
      const next = current.filter((item: any) => item.id !== id)
      saveArtifact('risks', next)
      return { ...s, 'Risks': { ...s['Risks'], data: next } }
    })
  }, [saveArtifact])

  const editRisk = useCallback((id: string, field: string, value: string | boolean) => {
    setModuleStates((s) => {
      const current = (s['Risks'].data as unknown[]) || []
      const next = current.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
      saveArtifact('risks', next)
      return { ...s, 'Risks': { ...s['Risks'], data: next } }
    })
  }, [saveArtifact])

  // ── Autosave ────────────────────────────────────────────────────────────────

  const triggerAutosave = useCallback((inputs: Record<string, unknown>) => {
    setAutosaveStatus('saving')
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      try {
        const { workbenchesApi } = await import('@/lib/api')
        await workbenchesApi.autosave(workbenchId, { inputs })
        setAutosaveStatus('saved')
        setTimeout(() => setAutosaveStatus('idle'), 2000)
      } catch {
        setAutosaveStatus('idle')
      }
    }, 2500)
  }, [workbenchId])

  const clearAutosaveStatus = useCallback(() => setAutosaveStatus('idle'), [])

  return {
    moduleStates,
    activeTab,
    autosaveStatus,
    generatingModal,
    elapsedSeconds,
    setActiveTab,
    updateModuleState,
    generateModule,
    regenerateModule,
    addEpic,
    deleteEpic,
    addStory,
    deleteStory,
    addScenario,
    deleteScenario,
    editScenario,
    addEvent,
    deleteEvent,
    editEvent,
    addRisk,
    deleteRisk,
    editRisk,
    triggerAutosave,
    clearAutosaveStatus,
  }
}