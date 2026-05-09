'use client'

import * as React from 'react'
import { X, Key, Globe, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Provider = 'openai' | 'minimax'

interface LLMConfig {
  provider: Provider
  apiKey: string
  baseUrl: string
  model: string
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  config: LLMConfig
  onChange: (config: LLMConfig) => void
  onSave: () => void
}

export function SettingsModal({ open, onClose, config, onChange, onSave }: SettingsModalProps) {
  const handleField = (field: keyof LLMConfig, value: string) => {
    onChange({ ...config, [field]: value })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-surface rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">LLM Settings</h2>
            <p className="text-xs text-text-secondary mt-0.5">Configure your AI provider</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Provider */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['openai', 'minimax'] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleField('provider', p)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    config.provider === p
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-background text-text-secondary border-border hover:border-accent/40'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI' : 'MiniMax'}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleField('apiKey', e.target.value)}
              placeholder={config.provider === 'minimax' ? 'Bearer token from MiniMax console' : 'sk-...'}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Base URL
            </label>
            <Input
              value={config.baseUrl}
              onChange={(e) => handleField('baseUrl', e.target.value)}
              placeholder={
                config.provider === 'minimax'
                  ? 'https://api.minimax.chat/v1'
                  : 'https://api.openai.com/v1'
              }
            />
            <p className="text-xs text-text-secondary/60">
              Leave blank to use default for {config.provider === 'minimax' ? 'MiniMax' : 'OpenAI'}
            </p>
          </div>

          {/* Model */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Model
            </label>
            <Input
              value={config.model}
              onChange={(e) => handleField('model', e.target.value)}
              placeholder={
                config.provider === 'minimax' ? 'MiniMax-Text-01' : 'gpt-4o'
              }
            />
            <p className="text-xs text-text-secondary/60">
              {config.provider === 'minimax'
                ? 'Text models: MiniMax-Text-01 | Vision: MiniMax-Image-01'
                : 'e.g. gpt-4o, gpt-4o-mini, gpt-4-turbo'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  )
}