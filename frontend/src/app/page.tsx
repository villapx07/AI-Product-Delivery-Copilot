'use client'

import * as React from 'react'
import { Header } from '@/components/layout/Header'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { CenterPanel } from '@/components/layout/CenterPanel'
import { AIReviewer } from '@/components/reviewer/AIReviewer'
import type { DiscoveryInputs } from '@/components/inputs/DiscoveryForm'

interface UploadedFile {
  id: string
  name: string
  size: number
  preview?: string
  data: string
}

interface Session {
  id: string
  title: string
  date: string
}

// Placeholder demo data
const DEMO_EPICS: any[] = [
  {
    id: '1',
    title: 'Instant Loan Approval',
    description: 'Enable eligible users to receive loan approval decisions within 60 seconds of application submission',
    teams: ['Product', 'Engineering', 'Risk', 'Compliance'],
    dependencies: 'Credit scoring service, KYC integration',
    priority: 'P0',
  },
  {
    id: '2',
    title: 'Loan Repayment Dashboard',
    description: 'Provide borrowers with real-time visibility into their repayment schedule, remaining balance, and payment history',
    teams: ['Product', 'UX', 'Engineering'],
    dependencies: 'Core banking ledger, Payment gateway',
    priority: 'P1',
  },
]

const DEMO_STORIES: any[] = [
  {
    id: '1',
    epicId: 'Instant Loan Approval',
    user: 'borrower',
    goal: 'receive a loan decision in under 60 seconds',
    benefit: 'I can plan my finances without uncertainty',
    criteria: [
      { id: 'c1', text: 'User receives decision within 60 seconds of submission', type: 'happy' },
      { id: 'c2', text: 'System shows loading state with progress indicator', type: 'happy' },
      { id: 'c3', text: 'If backend times out, user sees graceful error with retry option', type: 'edge' },
      { id: 'c4', text: 'Rejected application shows reason code, not raw score', type: 'negative' },
    ],
  },
]

const DEMO_QA: any[] = [
  { id: 'q1', title: 'Submit application with valid inputs', type: 'positive', preconditions: 'User is authenticated and has no existing loan', steps: '1. Fill all required fields\n2. Accept T&C\n3. Click Submit', expectedResult: 'Decision returned within 60s with approval or rejection reason' },
  { id: 'q2', title: 'Submit with missing required field', type: 'negative', preconditions: 'User has opened the form', steps: '1. Leave "annual income" empty\n2. Click Submit', expectedResult: 'Inline validation error shown, form not submitted' },
]

const DEMO_ANALYTICS: any[] = [
  { id: 'a1', eventName: 'loan_application_started', trigger: 'User opens application form', purpose: 'Track funnel drop-off at entry', funnelStage: 'awareness' },
  { id: 'a2', eventName: 'loan_application_submitted', trigger: 'User clicks Submit with valid data', purpose: 'Measure submission rate', funnelStage: 'consideration' },
  { id: 'a3', eventName: 'loan_approval_issued', trigger: 'Backend returns APPROVED', purpose: 'Track conversion to approved loans', funnelStage: 'conversion' },
]

const DEMO_RISKS: any[] = [
  { id: 'r1', text: 'Credit scoring service SLA not guaranteed at 99.9%', type: 'technical', severity: 'high', checked: false, suggestedAction: 'Add circuit breaker + fallback to manual review' },
  { id: 'r2', text: 'Regulatory review may require 48h cooling period for first-time borrowers', type: 'compliance', severity: 'medium', checked: false, suggestedAction: 'Validate with Legal before launch date' },
  { id: 'r3', text: 'KYC provider rate limits may cause timeout during peak hours', type: 'operational', severity: 'high', checked: false, suggestedAction: 'Implement async queue with SMS notification' },
  { id: 'r4', text: 'Disbursement to unverified bank accounts may trigger fraud', type: 'stakeholder', severity: 'high', checked: false, suggestedAction: 'Require bank account verification before disbursement' },
]

const DEMO_REVIEWS = [
  { id: 'rv1', category: 'risk', message: 'Disbursement to unverified accounts — fraud risk flagged. Address before sprint planning.', dismissed: false },
  { id: 'rv2', category: 'compliance', message: 'Regulatory cooling period assumption not validated with Legal.', dismissed: false },
  { id: 'rv3', category: 'stakeholder', message: 'Accounting team not in impacted teams list — revenue recognition approach unclear.', dismissed: false },
  { id: 'rv4', category: 'missing', message: 'Retry logic not defined for failed disbursement. What happens if payout fails after approval?', dismissed: false },
  { id: 'rv5', category: 'completeness', message: 'Epic Map covers E2E flow well. Analytics instrumentation is solid.', dismissed: true },
]

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = React.useState('epic')
  const [isGenerating, setIsGenerating] = React.useState(false)

  const [inputs, setInputs] = React.useState<DiscoveryInputs>({
    feature_title: '',
    business_objective: '',
    problem_statement: '',
    success_metrics: '',
    constraints: '',
    assumptions: '',
    impacted_teams: [],
  })

  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [sessions] = React.useState<Session[]>([
    { id: '1', title: 'Instant Loan Approval', date: 'May 9, 2026' },
  ])

  const [epicMap, setEpicMap] = React.useState(DEMO_EPICS)
  const [userStories, setUserStories] = React.useState(DEMO_STORIES)
  const [qaScenarios, setQaScenarios] = React.useState(DEMO_QA)
  const [analyticsEvents, setAnalyticsEvents] = React.useState(DEMO_ANALYTICS)
  const [risks, setRisks] = React.useState(DEMO_RISKS)
  const [reviewItems, setReviewItems] = React.useState(DEMO_REVIEWS)
  const [isRegenerating, setIsRegenerating] = React.useState<Record<string, boolean>>({})

  const handleInputsChange = (field: keyof DiscoveryInputs, value: string | string[]) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  const handleLoadSession = (id: string) => {
    // In MVP, just show existing demo data
    console.log('Loading session', id)
  }

  const handleClearSessions = () => {
    // In MVP, no sessions to clear
  }

  const handleEditEpic = (id: string, field: string, value: string) => {
    setEpicMap((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  const handleEditStory = (storyId: string, field: string, value: string) => {
    if (field.startsWith('criterion_')) {
      const criterionId = field.replace('criterion_', '')
      setUserStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? { ...s, criteria: s.criteria.map((c) => (c.id === criterionId ? { ...c, text: value } : c)) }
            : s
        )
      )
    } else {
      setUserStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, [field]: value } : s)))
    }
  }

  const handleAddCriterion = (storyId: string) => {
    const newCriterion = { id: `c${Date.now()}`, text: 'New acceptance criterion', type: 'happy' as const }
    setUserStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, criteria: [...s.criteria, newCriterion] } : s))
    )
  }

  const handleRemoveCriterion = (storyId: string, criterionId: string) => {
    setUserStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, criteria: s.criteria.filter((c) => c.id !== criterionId) } : s))
    )
  }

  const handleEditQA = (id: string, field: string, value: string) => {
    setQaScenarios((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const handleAddScenario = (type: any) => {
    const newScenario = { id: `q${Date.now()}`, title: 'New scenario', type, preconditions: 'TBD', steps: 'TBD', expectedResult: 'TBD' }
    setQaScenarios((prev) => [...prev, newScenario])
  }

  const handleRemoveScenario = (id: string) => {
    setQaScenarios((prev) => prev.filter((q) => q.id !== id))
  }

  const handleEditAnalytics = (id: string, field: string, value: string) => {
    setAnalyticsEvents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleAddAnalytics = () => {
    const newEvent = { id: `a${Date.now()}`, eventName: 'new_event', trigger: 'TBD', purpose: 'TBD', funnelStage: 'awareness' as const }
    setAnalyticsEvents((prev) => [...prev, newEvent])
  }

  const handleRemoveAnalytics = (id: string) => {
    setAnalyticsEvents((prev) => prev.filter((a) => a.id !== id))
  }

  const handleEditRisk = (id: string, field: string, value: string | boolean) => {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleAddRisk = () => {
    const newRisk = { id: `r${Date.now()}`, text: 'New risk item', type: 'technical' as const, severity: 'medium' as const, checked: false, suggestedAction: '' }
    setRisks((prev) => [...prev, newRisk])
  }

  const handleRemoveRisk = (id: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRegenerate = (module: string) => {
    setIsRegenerating((prev) => ({ ...prev, [module]: true }))
    setTimeout(() => {
      setIsRegenerating((prev) => ({ ...prev, [module]: false }))
    }, 1500)
  }

  const handleDismissReview = (id: string) => {
    setReviewItems((prev) => prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)))
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex min-h-0">
        <LeftPanel
          inputs={inputs}
          files={files}
          onInputsChange={handleInputsChange}
          onFilesChange={setFiles}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          sessions={sessions}
          onLoadSession={handleLoadSession}
          onClearSessions={handleClearSessions}
        />
        <CenterPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          epicMap={epicMap}
          userStories={userStories}
          qaScenarios={qaScenarios}
          analyticsEvents={analyticsEvents}
          risks={risks}
          reviewItems={reviewItems}
          onEditEpic={handleEditEpic}
          onEditStory={handleEditStory}
          onAddCriterion={handleAddCriterion}
          onRemoveCriterion={handleRemoveCriterion}
          onEditQA={handleEditQA}
          onAddScenario={handleAddScenario}
          onRemoveScenario={handleRemoveScenario}
          onEditAnalytics={handleEditAnalytics}
          onAddAnalytics={handleAddAnalytics}
          onRemoveAnalytics={handleRemoveAnalytics}
          onEditRisk={handleEditRisk}
          onAddRisk={handleAddRisk}
          onRemoveRisk={handleRemoveRisk}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
        <AIReviewer items={reviewItems} onDismiss={handleDismissReview} />
      </div>
    </div>
  )
}