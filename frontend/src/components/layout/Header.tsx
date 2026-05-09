'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { Download, Settings, Zap } from 'lucide-react'

interface HeaderProps {
  projectTitle?: string
  onExportAll?: () => void
  onOpenSettings?: () => void
}

export function Header({ projectTitle = 'AI Product Delivery Copilot', onExportAll, onOpenSettings }: HeaderProps) {
  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">{projectTitle}</h1>
          <p className="text-xs text-text-secondary">MVP v1.0</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onExportAll}>
          <Download className="w-3.5 h-3.5" />
          Export All
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings} title="LLM Settings">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>
    </header>
  )
}