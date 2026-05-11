'use client'

/**
 * useGeneration — hook for per-module generation with SSE parsing.
 * Handles the full lifecycle: prerequisite checks, SSE streaming,
 * artifact saving, and state updates.
 */
import { useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { artifactsApi } from '@/lib/api'

export type ModuleName = 'Epic Map' | 'User Stories' | 'QA Scenarios' | 'Analytics' | 'Risks' | 'Review'
export type ModuleStatus = 'idle' | 'generating' | 'saved' | 'error' | 'missing_prereq'

export interface ModuleState {
  status: ModuleStatus
  data: unknown
  updatedAt: string | null
  error: string | null
}

const MODULE_KEYS: Record<ModuleName, string> = {
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

export function useGeneration(moduleStates: Record<ModuleName, ModuleState>) {
  const saveArtifact = useCallback(async (workbenchId: string, moduleKey: string, data: unknown) => {
    await artifactsApi.save(workbenchId, {
      artifact_type: moduleKey,
      content_json: JSON.stringify(data),
    })
  }, [])

  /**
   * checkPrerequisites — returns error message string if prereqs not met, else null
   */
  const checkPrerequisites = useCallback(
    (module: ModuleName): string | null => {
      const prereqs = PREREQUISITES[module]
      for (const p of prereqs) {
        const pState = moduleStates[p]
        if (!pState || pState.status !== 'saved') {
          return `Generate ${p} first`
        }
      }
      return null
    },
    [moduleStates],
  )

  /**
   * parseSSE - parse SSE text into module data, handling all event types.
   * Returns { parsedData, error } tuple.
   */
  const parseSSE = useCallback(
    (text: string, moduleKey: string): { parsedData: unknown; error: string | null } => {
      const eventBlocks = text.split('\n\n')
      for (const block of eventBlocks) {
        const lines = block.split('\n')
        let eventType = ''
        let dataLine = ''
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim()
          if (line.startsWith('data:')) dataLine = line.slice(5).trim()
        }
        if (!dataLine) continue
        try {
          const parsed = JSON.parse(dataLine)
          if (eventType === 'prerequisite_missing') {
            return { parsedData: null, error: `Generate ${parsed} first` }
          }
          if (eventType === 'error') {
            return { parsedData: null, error: String(parsed) }
          }
          if (parsed && typeof parsed === 'object' && moduleKey in parsed) {
            return { parsedData: parsed[moduleKey], error: null }
          }
        } catch {
          // skip non-JSON lines
        }
      }
      return { parsedData: null, error: null }
    },
    [],
  )

  /**
   * generate — POST to /api/generate/modular and parse the SSE response.
   */
  const generate = useCallback(
    async (workbenchId: string, module: ModuleName, regenerate = false): Promise<{ parsedData: unknown; error: string | null }> => {
      const prereqError = checkPrerequisites(module)
      if (prereqError) return { parsedData: null, error: prereqError }

      const moduleKey = MODULE_KEYS[module]
      const response = await fetch('/api/generate/modular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ workbench_id: workbenchId, module: moduleKey, regenerate }),
      })

      if (!response.ok) {
        const errText = await response.text()
        return { parsedData: null, error: `Generation failed: ${response.status} — ${errText}` }
      }

      const text = await response.text()
      return parseSSE(text, moduleKey)
    },
    [checkPrerequisites, parseSSE],
  )

  return { saveArtifact, checkPrerequisites, parseSSE, generate }
}