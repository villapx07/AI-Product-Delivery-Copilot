'use client'

import * as React from 'react'
import { DiscoveryForm } from '@/components/inputs/DiscoveryForm'
import { FileUpload } from '@/components/inputs/FileUpload'
import { ChevronRight, History, Trash2 } from 'lucide-react'
import type { DiscoveryInputs } from '@/components/inputs/DiscoveryForm'

interface UploadedFile {
  id: string
  name: string
  size: number
  preview?: string
  data: string
}

interface LeftPanelProps {
  inputs: DiscoveryInputs
  files: UploadedFile[]
  onInputsChange: (field: keyof DiscoveryInputs, value: string | string[]) => void
  onFilesChange: (files: UploadedFile[]) => void
  onGenerate: () => void
  isGenerating: boolean
  generatingModule?: string | null
  sessions: { id: string; title: string; date: string }[]
  onLoadSession: (id: string) => void
  onClearSessions: () => void
}

export function LeftPanel({
  inputs,
  files,
  onInputsChange,
  onFilesChange,
  onGenerate,
  isGenerating,
  generatingModule,
  sessions,
  onLoadSession,
  onClearSessions,
}: LeftPanelProps) {
  const canGenerate = inputs.feature_title.trim().length > 0 && inputs.business_objective.trim().length > 0
  const [historyOpen, setHistoryOpen] = React.useState(false)

  return (
    <aside className="w-80 bg-surface border-r border-border flex flex-col shrink-0 h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Discovery</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {/* Form */}
        <DiscoveryForm
          inputs={inputs}
          onChange={onInputsChange}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          generatingModule={generatingModule}
          canGenerate={canGenerate}
        />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* File Upload */}
        <FileUpload files={files} onFilesChange={onFilesChange} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Session History */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary w-full"
          >
            <History className="w-3.5 h-3.5" />
            Session History
            <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
          </button>

          {historyOpen && (
            <div className="mt-2 flex flex-col gap-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-text-secondary/60 py-2">No sessions yet</p>
              ) : (
                <>
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onLoadSession(session.id)}
                      className="text-left px-2 py-1.5 rounded hover:bg-background text-xs text-text-primary"
                    >
                      <span className="font-medium">{session.title}</span>
                      <span className="text-text-secondary/60 ml-2">{session.date}</span>
                    </button>
                  ))}
                  <button
                    onClick={onClearSessions}
                    className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 px-2 py-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear history
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}