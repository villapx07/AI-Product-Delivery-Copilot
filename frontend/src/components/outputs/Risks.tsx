'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Copy, Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RiskItem {
  id: string
  text: string
  type: 'technical' | 'compliance' | 'operational' | 'stakeholder' | 'assumption'
  severity: 'high' | 'medium' | 'low'
  checked: boolean
  suggestedAction?: string
}

interface RisksProps {
  data: RiskItem[]
  onEdit: (id: string, field: keyof RiskItem, value: string | boolean) => void
  onAddRisk: () => void
  onRemoveRisk: (id: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export function Risks({ data, onEdit, onAddRisk, onRemoveRisk, isRegenerating, onRegenerate }: RisksProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    const text = data.map(item => {
      const check = item.checked ? '[x]' : '[ ]'
      return `${check} [${item.severity.toUpperCase()}] [${item.type}] ${item.text}\n  Action: ${item.suggestedAction || 'N/A'}`
    }).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const severityColors = {
    high: 'bg-danger/10 text-danger border-danger/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-success/10 text-success border-success/20',
  }

  const typeIcons: Record<RiskItem['type'], string> = {
    technical: '🔧',
    compliance: '📋',
    operational: '⚙️',
    stakeholder: '👥',
    assumption: '💡',
  }

  const grouped = {
    technical: data.filter((d) => d.type === 'technical'),
    compliance: data.filter((d) => d.type === 'compliance'),
    operational: data.filter((d) => d.type === 'operational'),
    stakeholder: data.filter((d) => d.type === 'stakeholder'),
    assumption: data.filter((d) => d.type === 'assumption'),
  }

  const checkedCount = data.filter((d) => d.checked).length

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-text-secondary">No risks identified yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Risks & Dependencies</h2>
          <span className="text-xs text-text-secondary">
            {checkedCount}/{data.length} addressed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onAddRisk}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
          <Button variant="ghost" size="sm" loading={isRegenerating} onClick={onRegenerate}>
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {data.length > 0 && (
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-300"
            style={{ width: `${(checkedCount / data.length) * 100}%` }}
          />
        </div>
      )}

      {/* Grouped sections */}
      {(['technical', 'compliance', 'operational', 'stakeholder', 'assumption'] as const).map((type) => {
        const items = grouped[type]
        if (items.length === 0) return null
        return (
          <div key={type}>
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
              <span>{typeIcons[type]}</span>
              {type}
              <span className="text-text-secondary/40">({items.length})</span>
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    item.checked ? 'bg-success/5 border-success/20' : 'bg-background border-border'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => onEdit(item.id, 'checked', !item.checked)}
                    className="mt-0.5 shrink-0"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-success" />
                    ) : (
                      <Square className="w-4 h-4 text-text-secondary/40" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(item.id, 'text', e.currentTarget.textContent || '')}
                        className={cn(
                          'text-sm outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1',
                          item.checked ? 'line-through text-text-secondary' : 'text-text-primary font-medium'
                        )}
                      >
                        {item.text}
                      </div>
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium border shrink-0', severityColors[item.severity])}>
                        {item.severity}
                      </span>
                    </div>
                    {item.suggestedAction && (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(item.id, 'suggestedAction', e.currentTarget.textContent || '')}
                        className="text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                      >
                        → {item.suggestedAction}
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveRisk(item.id)}
                    className="p-1 rounded hover:bg-border text-text-secondary/30 hover:text-danger transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}