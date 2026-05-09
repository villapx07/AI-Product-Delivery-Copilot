'use client'

import * as React from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { EpicMap } from '@/components/outputs/EpicMap'
import { UserStories } from '@/components/outputs/UserStories'
import { QAScenarios } from '@/components/outputs/QAScenarios'
import { AnalyticsEvents } from '@/components/outputs/AnalyticsEvents'
import { Risks } from '@/components/outputs/Risks'
import type { Epic } from '@/components/outputs/EpicMap'
import type { UserStory } from '@/components/outputs/UserStories'
import type { QAScenario } from '@/components/outputs/QAScenarios'
import type { AnalyticsEvent } from '@/components/outputs/AnalyticsEvents'
import type { RiskItem } from '@/components/outputs/Risks'

interface CenterPanelProps {
  activeTab: string
  onTabChange: (tab: string) => void
  epicMap: Epic[]
  userStories: UserStory[]
  qaScenarios: QAScenario[]
  analyticsEvents: AnalyticsEvent[]
  risks: RiskItem[]
  reviewItems: { id: string; category: string; message: string; dismissed: boolean }[]
  onEditEpic: (id: string, field: keyof Epic, value: string) => void
  onEditStory: (storyId: string, field: string, value: string) => void
  onAddCriterion: (storyId: string) => void
  onRemoveCriterion: (storyId: string, criterionId: string) => void
  onEditQA: (id: string, field: keyof QAScenario, value: string) => void
  onAddScenario: (type: QAScenario['type']) => void
  onRemoveScenario: (id: string) => void
  onEditAnalytics: (id: string, field: keyof AnalyticsEvent, value: string) => void
  onAddAnalytics: () => void
  onRemoveAnalytics: (id: string) => void
  onEditRisk: (id: string, field: keyof RiskItem, value: string | boolean) => void
  onAddRisk: () => void
  onRemoveRisk: (id: string) => void
  onRegenerate: (module: string) => void
  isRegenerating: Record<string, boolean>
}

const TABS = [
  { id: 'epic', label: 'Epic Map', badge: undefined },
  { id: 'stories', label: 'User Stories', badge: undefined },
  { id: 'qa', label: 'QA Scenarios', badge: undefined },
  { id: 'analytics', label: 'Analytics', badge: undefined },
  { id: 'risks', label: 'Risks', badge: undefined },
]

export function CenterPanel({
  activeTab,
  onTabChange,
  epicMap,
  userStories,
  qaScenarios,
  analyticsEvents,
  risks,
  onEditEpic,
  onEditStory,
  onAddCriterion,
  onRemoveCriterion,
  onEditQA,
  onAddScenario,
  onRemoveScenario,
  onEditAnalytics,
  onAddAnalytics,
  onRemoveAnalytics,
  onEditRisk,
  onAddRisk,
  onRemoveRisk,
  onRegenerate,
  isRegenerating,
}: CenterPanelProps) {
  const tabBadges = {
    epic: epicMap.length > 0 ? String(epicMap.length) : undefined,
    stories: userStories.length > 0 ? String(userStories.length) : undefined,
    qa: qaScenarios.length > 0 ? String(qaScenarios.length) : undefined,
    analytics: analyticsEvents.length > 0 ? String(analyticsEvents.length) : undefined,
    risks: risks.length > 0 ? String(risks.length) : undefined,
  }

  const tabs = TABS.map((t) => ({ ...t, badge: tabBadges[t.id as keyof typeof tabBadges] }))

  const [generatingModule, setGeneratingModule] = React.useState<string | null>(null)

  return (
    <main className="flex-1 flex flex-col bg-background min-w-0 h-full overflow-hidden">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'epic' && (
          <EpicMap
            data={epicMap}
            onEdit={onEditEpic}
            onRegenerate={() => onRegenerate('epic')}
            isRegenerating={isRegenerating.epic}
          />
        )}
        {activeTab === 'stories' && (
          <UserStories
            data={userStories}
            onEdit={onEditStory}
            onAddCriterion={onAddCriterion}
            onRemoveCriterion={onRemoveCriterion}
            onRegenerate={() => onRegenerate('stories')}
            isRegenerating={isRegenerating.stories}
          />
        )}
        {activeTab === 'qa' && (
          <QAScenarios
            data={qaScenarios}
            onEdit={onEditQA}
            onAddScenario={onAddScenario}
            onRemoveScenario={onRemoveScenario}
            onRegenerate={() => onRegenerate('qa')}
            isRegenerating={isRegenerating.qa}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsEvents
            data={analyticsEvents}
            onEdit={onEditAnalytics}
            onAddEvent={onAddAnalytics}
            onRemoveEvent={onRemoveAnalytics}
            onRegenerate={() => onRegenerate('analytics')}
            isRegenerating={isRegenerating.analytics}
          />
        )}
        {activeTab === 'risks' && (
          <Risks
            data={risks}
            onEdit={onEditRisk}
            onAddRisk={onAddRisk}
            onRemoveRisk={onRemoveRisk}
            onRegenerate={() => onRegenerate('risks')}
            isRegenerating={isRegenerating.risks}
          />
        )}
      </div>
    </main>
  )
}