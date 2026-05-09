'use client'

import * as React from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const TEAMS = [
  'Product',
  'UX',
  'Engineering',
  'Data',
  'Analytics',
  'Finance',
  'Accounting',
  'Security',
  'Privacy',
  'Compliance',
  'CRM',
  'Operations',
]

export interface DiscoveryInputs {
  feature_title: string
  business_objective: string
  problem_statement: string
  success_metrics: string
  constraints: string
  assumptions: string
  impacted_teams: string[]
}

interface DiscoveryFormProps {
  inputs: DiscoveryInputs
  onChange: (field: keyof DiscoveryInputs, value: string | string[]) => void
  onGenerate: () => void
  isGenerating: boolean
  canGenerate: boolean
  generatingModule?: string | null
}

export function DiscoveryForm({ inputs, onChange, onGenerate, isGenerating, canGenerate, generatingModule }: DiscoveryFormProps) {
  const handleTeamToggle = (team: string) => {
    const current = inputs.impacted_teams
    const updated = current.includes(team)
      ? current.filter((t) => t !== team)
      : [...current, team]
    onChange('impacted_teams', updated)
  }

  console.log('[DiscoveryForm] canGenerate:', canGenerate, 'isGenerating:', isGenerating, 'feature_title:', inputs.feature_title)

  return (
    <div className="flex flex-col gap-4">
      <Input
        id="feature_title"
        label="Feature Title *"
        placeholder="e.g., Instant Loan Approval"
        value={inputs.feature_title}
        onChange={(e) => onChange('feature_title', e.target.value)}
      />
      <Textarea
        id="business_objective"
        label="Business Objective *"
        placeholder="What business outcome are we driving?"
        value={inputs.business_objective}
        onChange={(e) => onChange('business_objective', e.target.value)}
      />
      <Textarea
        id="problem_statement"
        label="Problem Statement"
        placeholder="What problem does this solve for users?"
        value={inputs.problem_statement}
        onChange={(e) => onChange('problem_statement', e.target.value)}
      />
      <Textarea
        id="success_metrics"
        label="Success Metrics"
        placeholder="e.g., Approval rate > 80%, Avg processing time < 3 mins"
        value={inputs.success_metrics}
        onChange={(e) => onChange('success_metrics', e.target.value)}
      />
      <Textarea
        id="constraints"
        label="Constraints"
        placeholder="Technical, regulatory, or business constraints"
        value={inputs.constraints}
        onChange={(e) => onChange('constraints', e.target.value)}
      />
      <Textarea
        id="assumptions"
        label="Rollout Assumptions"
        placeholder="Phased rollout plan or dependencies"
        value={inputs.assumptions}
        onChange={(e) => onChange('assumptions', e.target.value)}
      />

      {/* Impacted Teams */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-text-secondary">Impacted Teams</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TEAMS.map((team) => (
            <label
              key={team}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                inputs.impacted_teams.includes(team)
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'bg-background text-text-secondary hover:bg-border'
              )}
            >
              <input
                type="checkbox"
                checked={inputs.impacted_teams.includes(team)}
                onChange={() => handleTeamToggle(team)}
                className="sr-only"
              />
              {team}
            </label>
          ))}
        </div>
      </div>

      <Button
        onClick={() => { console.log('[Button] clicked! canGenerate:', canGenerate); onGenerate() }}
        disabled={!canGenerate}
        loading={isGenerating}
        size="lg"
        className="w-full mt-2"
      >
        {isGenerating
          ? generatingModule
            ? `Generating ${generatingModule.replace('_', ' ')}...`
            : 'Analyzing...'
          : 'Generate Delivery Artifacts'}
      </Button>
    </div>
  )
}