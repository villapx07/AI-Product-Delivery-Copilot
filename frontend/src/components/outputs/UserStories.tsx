'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Copy, Plus, Trash2 } from 'lucide-react'

interface AcceptanceCriterion {
  id: string
  text: string
  type: 'happy' | 'negative' | 'edge'
}

interface UserStory {
  id: string
  epicId: string
  user: string
  goal: string
  benefit: string
  criteria: AcceptanceCriterion[]
}

interface UserStoriesProps {
  data: UserStory[]
  onEdit: (storyId: string, field: string, value: string) => void
  onAddCriterion: (storyId: string) => void
  onRemoveCriterion: (storyId: string, criterionId: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export function UserStories({ data, onEdit, onAddCriterion, onRemoveCriterion, isRegenerating, onRegenerate }: UserStoriesProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    const text = data.map((s, i) =>
      `### User Story ${i + 1}\n**As a** ${s.user}\n**I want** ${s.goal}\n**So that** ${s.benefit}\n\n**Acceptance Criteria:**\n${s.criteria.map(c => `- [${c.type}] ${c.text}`).join('\n')}`
    ).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const criterionTypeColors = {
    happy: 'text-success',
    negative: 'text-danger',
    edge: 'text-warning',
  }

  const criterionLabel = { happy: '✓', negative: '✗', edge: '?' }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-text-secondary">No user stories generated yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">User Stories</h2>
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

      {/* Group by epic */}
      {Object.entries(
        data.reduce<Record<string, UserStory[]>>((acc, story) => {
          const key = story.epicId || 'ungrouped'
          if (!acc[key]) acc[key] = []
          acc[key].push(story)
          return acc
        }, {})
      ).map(([epicId, stories]) => (
        <div key={epicId} className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-accent uppercase tracking-wide">{epicId || 'General'}</h3>
          {stories.map((story, idx) => (
            <div key={story.id} className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary">#{idx + 1}</span>
              </div>

              {/* USER STORY block */}
              <div className="bg-surface border border-border rounded-md p-3 mb-3">
                <p className="text-xs font-medium text-text-secondary mb-1">USER STORY</p>
                <p className="text-sm">
                  <span className="text-text-secondary">As a </span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(story.id, 'user', e.currentTarget.textContent || '')}
                    className="font-medium text-accent outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                  >
                    {story.user}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-text-secondary">I want </span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(story.id, 'goal', e.currentTarget.textContent || '')}
                    className="font-medium text-text-primary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                  >
                    {story.goal}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-text-secondary">So that </span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEdit(story.id, 'benefit', e.currentTarget.textContent || '')}
                    className="font-medium text-text-primary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                  >
                    {story.benefit}
                  </span>
                </p>
              </div>

              {/* ACCEPTANCE CRITERIA */}
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">ACCEPTANCE CRITERIA</p>
                <div className="flex flex-col gap-1.5">
                  {story.criteria.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span className={cn('text-xs font-bold mt-0.5', criterionTypeColors[c.type])}>
                        {criterionLabel[c.type]}
                      </span>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onEdit(story.id, `criterion_${c.id}`, e.currentTarget.textContent || '')}
                        className="flex-1 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/30 rounded px-1"
                      >
                        {c.text}
                      </div>
                      <button
                        onClick={() => onRemoveCriterion(story.id, c.id)}
                        className="p-1 rounded hover:bg-border text-text-secondary/50 hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onAddCriterion(story.id)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-2 px-1"
                >
                  <Plus className="w-3 h-3" />
                  Add criterion
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}