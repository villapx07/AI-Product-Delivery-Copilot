'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Copy, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AnalyticsEvent {
  id: string
  eventName: string
  trigger: string
  purpose: string
  funnelStage: 'awareness' | 'consideration' | 'conversion' | 'retention'
}

interface AnalyticsEventsProps {
  data: AnalyticsEvent[]
  onEdit: (id: string, field: keyof AnalyticsEvent, value: string) => void
  onAddEvent: () => void
  onRemoveEvent: (id: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export function AnalyticsEvents({ data, onEdit, onAddEvent, onRemoveEvent, isRegenerating, onRegenerate }: AnalyticsEventsProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    const headers = 'Event Name,Trigger,Purpose,Funnel Stage\n'
    const rows = data.map(e => `"${e.eventName}","${e.trigger}","${e.purpose}","${e.funnelStage}"`).join('\n')
    navigator.clipboard.writeText(headers + rows)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const funnelColors = {
    awareness: 'bg-text-secondary/10 text-text-secondary',
    consideration: 'bg-accent/10 text-accent',
    conversion: 'bg-success/10 text-success',
    retention: 'bg-warning/10 text-warning',
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-text-secondary">No analytics events generated yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Analytics Events</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onAddEvent}>
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </Button>
          <Button variant="ghost" size="sm" loading={isRegenerating} onClick={onRegenerate}>
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Event Name</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Trigger</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Purpose</th>
              <th className="text-left py-2 px-3 font-medium text-text-secondary">Funnel Stage</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={event.id} className="border-b border-border/50 hover:bg-background/50">
                <td className="py-2.5 px-3">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(event.id, 'eventName', e.currentTarget.textContent || '')}
                    className="font-mono text-sm font-medium text-accent outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {event.eventName}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(event.id, 'trigger', e.currentTarget.textContent || '')}
                    className="text-text-primary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {event.trigger}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(event.id, 'purpose', e.currentTarget.textContent || '')}
                    className="text-text-secondary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1 -mx-1"
                  >
                    {event.purpose}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', funnelColors[event.funnelStage])}>
                    {event.funnelStage}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <button
                    onClick={() => onRemoveEvent(event.id)}
                    className="p-1 rounded hover:bg-border text-text-secondary/50 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}