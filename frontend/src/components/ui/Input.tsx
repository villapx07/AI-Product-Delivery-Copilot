import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg',
            'placeholder:text-text-secondary/50',
            'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:ring-danger/30 focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'