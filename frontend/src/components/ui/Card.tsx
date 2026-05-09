import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  accentColor?: 'accent' | 'reviewer' | 'warning' | 'danger' | 'success'
}

export function Card({ children, className, accentColor, ...props }: CardProps) {
  const accentMap = {
    accent: 'border-l-accent',
    reviewer: 'border-l-reviewer',
    warning: 'border-l-warning',
    danger: 'border-l-danger',
    success: 'border-l-success',
  }
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-5',
        accentColor && `border-l-4 ${accentMap[accentColor]}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  badge?: string
  action?: React.ReactNode
}

export function CardHeader({ title, badge, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-accent-subtle text-accent font-medium">
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}