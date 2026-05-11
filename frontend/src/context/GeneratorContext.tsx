'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { artifactsApi } from '@/lib/api'

/**
 * GeneratorContext — wraps the AI generator state and provides
 * artifact persistence callbacks to the workbench layer.
 *
 * Modules (EpicMap, UserStories, etc.) receive `onArtifactSave`
 * and call it to persist their output data.
 */
interface GeneratorState {
  epic_map: EpicData | null
  user_stories: UserStoryData | null
  qa_scenarios: QAScenarioData | null
  analytics: AnalyticsData | null
  risks: RiskData | null
}

export interface EpicData { id: string; title: string; description: string; teams: string[]; dependencies: string; priority: 'P0' | 'P1' | 'P2' }
export interface UserStoryData { id: string; epic_id: string; title: string; as_a: string; i_want: string; so_that: string; acceptance_criteria: string[]; priority: 'P0' | 'P1' | 'P2' }
export interface QAScenarioData { id: string; story_id: string; scenario: string; steps: string[]; expected: string; priority: 'P0' | 'P1' | 'P2' }
export interface AnalyticsData { id: string; name: string; metric: string; baseline: string; target: string }
export interface RiskData { id: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW'; mitigation: string }

interface GeneratorContextValue {
  state: GeneratorState
  isGenerating: boolean
  generatingModule: string | null
  updateEpicMap: (data: EpicData[]) => void
  updateUserStories: (data: UserStoryData[]) => void
  updateQAScenarios: (data: QAScenarioData[]) => void
  updateAnalytics: (data: AnalyticsData[]) => void
  updateRisks: (data: RiskData[]) => void
  setGenerating: (module: string | null) => void
  saveArtifact: (workbenchId: string, artifactType: string, data: unknown) => Promise<void>
}

const GeneratorContext = createContext<GeneratorContextValue | null>(null)

export function GeneratorProvider({
  children,
  workbenchId,
  initialArtifacts = [],
}: {
  children: ReactNode
  workbenchId: string
  initialArtifacts?: Record<string, unknown>[]
}) {
  const [state, setState] = useState<GeneratorState>({
    epic_map: null, user_stories: null, qa_scenarios: null, analytics: null, risks: null,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingModule, setGeneratingModule] = useState<string | null>(null)

  // Rehydrate from saved artifacts
  const restoredRef = useRef(false)
  if (!restoredRef.current && initialArtifacts.length > 0) {
    restoredRef.current = true
    const hydrated: GeneratorState = { epic_map: null, user_stories: null, qa_scenarios: null, analytics: null, risks: null }
    for (const artifact of initialArtifacts) {
      const a = artifact as any
      if (a.artifact_type === 'epic_map' && a.data) hydrated.epic_map = a.data as EpicData
      if (a.artifact_type === 'user_stories' && a.data) hydrated.user_stories = a.data as UserStoryData
      if (a.artifact_type === 'qa_scenarios' && a.data) hydrated.qa_scenarios = a.data as QAScenarioData
      if (a.artifact_type === 'analytics' && a.data) hydrated.analytics = a.data as AnalyticsData
      if (a.artifact_type === 'risks' && a.data) hydrated.risks = a.data as RiskData
    }
    setState(hydrated)
  }

  const updateEpicMap = useCallback((data: EpicData[]) => {
    setState((s) => ({ ...s, epic_map: data as unknown as EpicData }))
  }, [])

  const updateUserStories = useCallback((data: UserStoryData[]) => {
    setState((s) => ({ ...s, user_stories: data as unknown as UserStoryData }))
  }, [])

  const updateQAScenarios = useCallback((data: QAScenarioData[]) => {
    setState((s) => ({ ...s, qa_scenarios: data as unknown as QAScenarioData }))
  }, [])

  const updateAnalytics = useCallback((data: AnalyticsData[]) => {
    setState((s) => ({ ...s, analytics: data as unknown as AnalyticsData }))
  }, [])

  const updateRisks = useCallback((data: RiskData[]) => {
    setState((s) => ({ ...s, risks: data as unknown as RiskData }))
  }, [])

  const setGenerating = useCallback((module: string | null) => {
    setIsGenerating(module !== null)
    setGeneratingModule(module)
  }, [])

  const saveArtifact = useCallback(async (wbId: string, artifactType: string, data: unknown) => {
    await artifactsApi.save(wbId, {
      artifact_type: artifactType,
      content_json: JSON.stringify(data),
    })
  }, [])

  return (
    <GeneratorContext.Provider value={{
      state, isGenerating, generatingModule,
      updateEpicMap, updateUserStories, updateQAScenarios, updateAnalytics, updateRisks,
      setGenerating, saveArtifact,
    }}>
      {children}
    </GeneratorContext.Provider>
  )
}

export function useGenerator() {
  const ctx = useContext(GeneratorContext)
  if (!ctx) throw new Error('useGenerator must be used within GeneratorProvider')
  return ctx
}