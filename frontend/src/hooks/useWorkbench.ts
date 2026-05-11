'use client'

/**
 * useWorkbench — primary hook for the workbench page.
 * Consolidates all state management into one place so page.tsx stays thin.
 *
 * Usage:
 *   const wb = useWorkbench(workbenchId, workbench, initialArtifacts)
 *   wb.generateModule('Epic Map')
 *   wb.updateModuleState('Epic Map', { status: 'saved', data: [...] })
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { ModuleName, ModuleState, useGeneration } from './useGeneration'
import type { Epic, UserStory } from '@/components/outputs/EpicMap'

const DEFAULT_STATES = (): Record<ModuleName, ModuleState> => ({
  'Epic Map':     { status: 'idle', data: null, updatedAt: null, error: null },
  'User Stories': { status: 'idle', data: null, updatedAt: null, error: null },
  'QA Scenarios': { status: 'idle', data: null, updatedAt: null, error: null },
  'Analytics':   { status: 'idle', data: null, updatedAt: null, error: null },
  'Risks':       { status: 'idle', data: null, updatedAt: null, error: null },
  'Review':      { status: 'idle', data: null, updatedAt: null, error: null },
})

export interface UseWorkbenchOptions {
  workbenchId: string
  workbench: Record<string, unknown>
  initialArtifacts?: Record<string, unknown>[]
}

export interface UseWorkbenchReturn {
  moduleStates: Record<ModuleName, ModuleState>
  activeTab: ModuleName
  autosaveStatus: 'idle' | 'saving' | 'saved'
  generatingModal: ModuleName | null
  elapsedSeconds: number

  // Tab management
  setActiveTab: (tab: ModuleName) => void

  // State mutation (for page.tsx to call after generation)
  updateModuleState: (module: ModuleName, state: Partial<ModuleState>) => void

  // Generation
  generateModule: (module: ModuleName) => Promise<void>
  regenerateModule: (module: ModuleName) => Promise<void>

  // Artifact edits
  addEpic: (epic: Epic) => void
  deleteEpic: (epicId: string) => void
  addStory: (epicId: string) => void
  deleteStory: (storyId: string) => void

  // Autosave
  triggerAutosave: (inputs: Record<string, unknown>) => void
  clearAutosaveStatus: () => void
}

export function useWorkbench({ workbenchId, workbench, initialArtifacts = [] }: UseWorkbenchOptions): UseWorkbenchReturn {
  const [moduleStates, setModuleStates] = useState<Record<ModuleName, ModuleState>>(DEFAULT_STATES)
  const [activeTab, setActiveTab] = useState<ModuleName>('Epic Map')
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [generatingModal, setGeneratingModal] = useState<ModuleName | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const generationStartRef = useRef<Partial<Record<ModuleName, number | null>>>({})

  const { generate, saveArtifact } = useGeneration(moduleStates)

  // Restore artifacts on mount
  useEffect(() => {
    if (!initialArtifacts || initialArtifacts.length === 0) return

    setModuleStates((s) => {
      const next = { ...s }
      for (const a of initialArtifacts as Array<{ artifact_type: string; data: unknown }>) {
        const map: Record<string, ModuleName> = {
          epic_map: 'Epic Map',
          user_stories: 'User Stories',
          qa_scenarios: 'QA Scenarios',
          analytics: 'Analytics',
          risks: 'Risks',
          reviewer: 'Review',
        }
        const tab = map[a.artifact_type]
        if (tab && a.data) {
          next[tab] = { status: 'saved', data: a.data, updatedAt: new Date().toISOString(), error: null }
        }
      }
      return next
    })
  }, [initialArtifacts])

  const clearAutosaveStatus = useCallback(() => setAutosaveStatus('idle'), [])

  const updateModuleState = useCallback((module: ModuleName, partial: Partial<ModuleState>) => {
    setModuleStates((s) => ({ ...s, [module]: { ...s[module], ...partial } }))
  }, [])

  const generateModule = useCallback(async (module: ModuleName) => {
    // Check prereqs first
    const prereqs: Record<ModuleName, ModuleName[]> = {
      'Epic Map': [], 'User Stories': ['Epic Map'], 'QA Scenarios': ['User Stories'],
      'Analytics': ['User Stories'], 'Risks': ['Epic Map', 'User Stories'],
      'Review': ['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks'],
    }
    for (const p of prereqs[module]) {
      const pState = moduleStates[p]
      if (!pState || pState.status !== 'saved') {
        updateModuleState(module, { status: 'missing_prereq', error: `Generate ${p} first` })
        return
      }
    }

    updateModuleState(module, { status: 'generating', error: null })
    setGeneratingModal(module)
    generationStartRef.current[module] = Date.now()
    setElapsedSeconds(0)

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    elapsedTimerRef.current = setInterval(() => {
      const start = generationStartRef.current[module]
      if (start) setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    try {
      const { parsedData, error } = await generate(workbenchId, module, false)
      if (error) {
        updateModuleState(module, { status: 'error', error })
      } else if (parsedData !== null) {
        await saveArtifact(workbenchId, module.replace(' ', '_').toLowerCase().replace('qa ', 'qa_').replace('user ', 'user_'), parsedData)
        updateModuleState(module, { status: 'saved', data: parsedData, updatedAt: new Date().toISOString(), error: null })
      }
    } catch (err: unknown) {
      updateModuleState(module, { status: 'error', error: (err as Error)?.message || 'Generation failed' })
    }

    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    setGeneratingModal(null)
  }, [workbenchId, moduleStates, generate, saveArtifact, updateModuleState])

  const regenerateModule = useCallback(async (module: ModuleName) => {
    updateModuleState(module, { status: 'generating', error: null })
    setGeneratingModal(module)
    generationStartRef.current[module] = Date.now()
    setElapsedSeconds(0)

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    elapsedTimerRef.current = setInterval(() => {
      const start = generationStartRef.current[module]
      if (start) setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    try {
      const { parsedData, error } = await generate(workbenchId, module, true)
      if (error) {
        updateModuleState(module, { status: 'error', error })
      } else if (parsedData !== null) {
        const keyMap: Record<ModuleName, string> = {
          'Epic Map': 'epic_map', 'User Stories': 'user_stories', 'QA Scenarios': 'qa_scenarios',
          'Analytics': 'analytics', 'Risks': 'risks', 'Review': 'reviewer',
        }
        await saveArtifact(workbenchId, keyMap[module], parsedData)
        updateModuleState(module, { status: 'saved', data: parsedData, updatedAt: new Date().toISOString(), error: null })
      }
    } catch (err: unknown) {
      updateModuleState(module, { status: 'error', error: (err as Error)?.message || 'Regeneration failed' })
    }

    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    setGeneratingModal(null)
  }, [workbenchId, generate, saveArtifact, updateModuleState])

  const addEpic = useCallback((newEpic: Epic) => {
    setModuleStates((s) => {
      const current = (s['Epic Map'].data as Epic[]) || []
      const next = [...current, newEpic]
      saveArtifact(workbenchId, 'epic_map', next)
      return { ...s, 'Epic Map': { ...s['Epic Map'], data: next, status: 'saved' } }
    })
  }, [workbenchId, saveArtifact])

  const deleteEpic = useCallback((epicId: string) => {
    setModuleStates((s) => {
      const current = (s['Epic Map'].data as Epic[]) || []
      const next = current.filter(e => e.id !== epicId)
      saveArtifact(workbenchId, 'epic_map', next)
      return { ...s, 'Epic Map': { ...s['Epic Map'], data: next, status: 'saved' } }
    })
  }, [workbenchId, saveArtifact])

  const addStory = useCallback((epicId: string) => {
    const newStory: UserStory = {
      id: `story-${Date.now()}`,
      epicId: epicId,
      user: 'User',
      goal: 'Goal',
      benefit: 'Benefit',
      criteria: [],
    }
    setModuleStates((s) => {
      const current = (s['User Stories'].data as UserStory[]) || []
      const next = [...current, newStory]
      saveArtifact(workbenchId, 'user_stories', next)
      return { ...s, 'User Stories': { ...s['User Stories'], data: next, status: 'saved' } }
    })
  }, [workbenchId, saveArtifact])

  const deleteStory = useCallback((storyId: string) => {
    setModuleStates((s) => {
      const current = (s['User Stories'].data as UserStory[]) || []
      const next = current.filter(st => st.id !== storyId)
      saveArtifact(workbenchId, 'user_stories', next)
      return { ...s, 'User Stories': { ...s['User Stories'], data: next, status: 'saved' } }
    })
  }, [workbenchId, saveArtifact])

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

  return {
    moduleStates, activeTab, autosaveStatus, generatingModal, elapsedSeconds,
    setActiveTab, updateModuleState,
    generateModule, regenerateModule,
    addEpic, deleteEpic, addStory, deleteStory,
    triggerAutosave, clearAutosaveStatus,
  }
}