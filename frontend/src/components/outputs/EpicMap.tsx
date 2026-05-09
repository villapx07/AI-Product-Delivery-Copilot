'use client'

import * as React from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Copy, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Epic {
  id: string
  title: string
  description: string
  teams: string[]
  dependencies: string
  priority: 'P0' | 'P1' | 'P2'
}

interface EpicMapProps {
  data: Epic[]
  onEdit: (id: string, field: keyof Epic, value: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export function EpicMap({ data, onEdit, isRegenerating, onRegenerate }: EpicMapProps) {
  const [copied, setCopied] = React.useState(false)

  const priorityColors = {
    P0: 'bg-danger/10 text-danger',
    P1: 'bg-warning/10 text-warning',
    P2: 'bg-accent/10 text-accent',
  }

  const handleCopy = () => {
    const text = data.map(e => `## ${e.title}\n${e.description}\nTeams: ${e.teams.join(', ')}\nPriority: ${e.priority}\nDependencies: ${e.dependencies}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-text-secondary">No epic map generated yet.</p>
        <p className="text-xs text-text-secondary/60 mt-1">Fill in the discovery form and click Generate.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Epic Map</h2>
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Epic</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Description</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Teams</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Dependencies</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Priority</th>
            </tr>
          </thead>
          <tbody>
            {data.map((epic) => (
              <tr key={epic.id} className="border-b border-border/50 hover:bg-background/50">
                <td className="py-2.5 px-3 font-medium text-text-primary align-top max-w-[160px]">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(epic.id, 'title', e.currentTarget.textContent || '')}
                    className="outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {epic.title}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-text-secondary align-top max-w-[200px]">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(epic.id, 'description', e.currentTarget.textContent || '')}
                    className="outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {epic.description}
                  </div>
                </td>
                <td className="py-2.5 px-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {epic.teams.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-accent-subtle text-accent text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-text-secondary align-top max-w-[140px]">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(epic.id, 'dependencies', e.currentTarget.textContent || '')}
                    className="outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {epic.dependencies}
                  </div>
                </td>
                <td className="py-2.5 px-3 align-top">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priorityColors[epic.priority])}>
                    {epic.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}