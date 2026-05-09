'use client'

import * as React from 'react'
import { AlertCircle, HelpCircle, AlertTriangle, Users, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ReviewCategory = 'missing' | 'assumption' | 'risk' | 'stakeholder' | 'completeness'

export interface ReviewItem {
  id: string
  category: ReviewCategory
  message: string
  dismissed: boolean
}

interface AIReviewerProps {
  items: ReviewItem[]
  onDismiss: (id: string) => void
}

const categoryConfig: Record<ReviewCategory, { icon: React.ElementType; color: string; label: string }> = {
  missing: { icon: AlertCircle, color: 'text-danger', label: 'Missing Logic' },
  assumption: { icon: HelpCircle, color: 'text-warning', label: 'Unclear Assumption' },
  risk: { icon: AlertTriangle, color: 'text-reviewer', label: 'Risk Flag' },
  stakeholder: { icon: Users, color: 'text-accent', label: 'Stakeholder Gap' },
  completeness: { icon: CheckCircle2, color: 'text-success', label: 'Completeness' },
}

export function AIReviewer({ items, onDismiss }: AIReviewerProps) {
  const activeItems = items.filter((i) => !i.dismissed)
  const grouped = Object.entries(
    activeItems.reduce<Record<string, ReviewItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  )

  return (
    <aside className="w-[300px] bg-surface border-l border-border flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-reviewer/10 rounded flex items-center justify-center">
            <span className="text-xs">🤖</span>
          </div>
          <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wide">AI Reviewer</h2>
        </div>
        {activeItems.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-reviewer/10 text-reviewer font-medium">
            {activeItems.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle2 className="w-8 h-8 text-success/40 mb-2" />
            <p className="text-sm text-text-secondary">Looking good!</p>
            <p className="text-xs text-text-secondary/60 mt-1">Review items will appear as artifacts are generated.</p>
          </div>
        ) : (
          grouped.map(([category, categoryItems]) => {
            const config = categoryConfig[category as ReviewCategory]
            const Icon = config.icon
            return (
              <div key={category} className="flex flex-col gap-2">
                <div className={cn('flex items-center gap-1.5 text-xs font-medium', config.color)}>
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <span className="text-text-secondary/40 ml-auto">({categoryItems.length})</span>
                </div>
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-background border border-border rounded-md p-3 text-xs"
                  >
                    <p className="text-text-primary leading-relaxed">{item.message}</p>
                    <button
                      onClick={() => onDismiss(item.id)}
                      className="flex items-center gap-1 text-text-secondary/50 hover:text-text-secondary mt-2 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <p className="text-xs text-text-secondary/60 text-center">
          Reviewer updates as each module generates
        </p>
      </div>
    </aside>
  )
}