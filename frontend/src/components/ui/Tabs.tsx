import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  tabs: { id: string; label: string; badge?: string }[]
  activeTab: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-border -mx-4 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors duration-150',
            'focus:outline-none',
            activeTab === tab.id
              ? 'text-accent'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-accent-subtle text-accent">
                {tab.badge}
              </span>
            )}
          </span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}