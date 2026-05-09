'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Copy, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QAScenario {
  id: string
  title: string
  type: 'positive' | 'negative' | 'edge' | 'validation'
  preconditions: string
  steps: string
  expectedResult: string
}

interface QAScenariosProps {
  data: QAScenario[]
  onEdit: (id: string, field: keyof QAScenario, value: string) => void
  onAddScenario: (type: QAScenario['type']) => void
  onRemoveScenario: (id: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export function QAScenarios({ data, onEdit, onAddScenario, onRemoveScenario, isRegenerating, onRegenerate }: QAScenariosProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    const text = data.map((s, i) =>
      `### Test ${i + 1}: ${s.title}\n**Type:** ${s.type}\n**Pre-conditions:** ${s.preconditions}\n**Steps:** ${s.steps}\n**Expected:** ${s.expectedResult}`
    ).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const typeColors = {
    positive: 'bg-success/10 text-success',
    negative: 'bg-danger/10 text-danger',
    edge: 'bg-warning/10 text-warning',
    validation: 'bg-accent/10 text-accent',
  }

  const grouped = {
    positive: data.filter((s) => s.type === 'positive'),
    negative: data.filter((s) => s.type === 'negative'),
    edge: data.filter((s) => s.type === 'edge'),
    validation: data.filter((s) => s.type === 'validation'),
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-text-secondary">No QA scenarios generated yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">QA Test Scenarios</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" loading={isRegenerating} onClick={onRegenerate}>
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['positive', 'negative', 'edge', 'validation'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onAddScenario(type)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              typeColors[type].replace('/10', '/5').replace('text-', 'border-')
            )}
          >
            <Plus className="w-3 h-3" />
            Add {type}
          </button>
        ))}
      </div>

      {/* Grouped sections */}
      {(['positive', 'negative', 'edge', 'validation'] as const).map((type) => {
        const items = grouped[type]
        if (items.length === 0) return null
        return (
          <div key={type}>
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className={cn('px-2 py-0.5 rounded text-xs font-bold', typeColors[type])}>{type}</span>
              <span>{items.length} scenario{items.length !== 1 ? 's' : ''}</span>
            </h3>
            <div className="flex flex-col gap-3">
              {items.map((scenario, idx) => (
                <div key={scenario.id} className="bg-background border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">#{idx + 1}</span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(scenario.id, 'title', e.currentTarget.textContent || '')}
                        className="font-medium text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                      >
                        {scenario.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', typeColors[type])}>{type}</span>
                      <button
                        onClick={() => onRemoveScenario(scenario.id)}
                        className="p-1 rounded hover:bg-border text-text-secondary/50 hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-text-secondary">Pre-conditions:</span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(scenario.id, 'preconditions', e.currentTarget.textContent || '')}
                        className="text-text-primary mt-0.5 outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                      >
                        {scenario.preconditions}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-text-secondary">Test Steps:</span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(scenario.id, 'steps', e.currentTarget.textContent || '')}
                        className="text-text-primary mt-0.5 outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                      >
                        {scenario.steps}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-text-secondary">Expected Result:</span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(scenario.id, 'expectedResult', e.currentTarget.textContent || '')}
                        className="text-text-primary mt-0.5 outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                      >
                        {scenario.expectedResult}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}