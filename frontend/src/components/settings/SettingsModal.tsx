'use client'

import * as React from 'react'
import { X, Key, Globe, Cpu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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

const MODELS: Record<Provider, { label: string; value: string; note?: string }[]> = {
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o', note: 'Recommended' },
    { label: 'GPT-4o-mini', value: 'gpt-4o-mini', note: 'Fast & affordable' },
    { label: 'GPT-4-turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'Custom model...', value: '__custom__' },
  ],
  minimax: [
    { label: 'MiniMax-M2.7', value: 'MiniMax-M2.7', note: 'Recommended · Claude-compatible' },
    { label: 'MiniMax-Text-01', value: 'MiniMax-Text-01' },
    { label: 'MiniMax-Image-01', value: 'MiniMax-Image-01', note: 'Vision' },
    { label: 'Custom model...', value: '__custom__' },
  ],
}

export function SettingsModal({ open, onClose, config, onChange, onSave }: SettingsModalProps) {
  const handleField = (field: keyof LLMConfig, value: string) => {
    onChange({ ...config, [field]: value })
  }

  const modelOptions = MODELS[config.provider] || []
  // Determine if current model is a known preset
  const selectedPreset = modelOptions.find((m) => m.value === config.model)
  const isCustomModel = !selectedPreset || config.model === '__custom__' || config.model === ''

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
                  onClick={() => {
                    // Switch provider → default to recommended model
                    const defaults = { openai: 'gpt-4o', minimax: 'Minimax2.7' }
                    handleField('provider', p)
                    handleField('model', defaults[p])
                  }}
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
              <span className="text-text-secondary/40 text-[10px] ml-auto">Optional</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => handleField('baseUrl', e.target.value)}
                placeholder={
                  config.provider === 'minimax'
                    ? 'Leave blank (uses MiniMax default)'
                    : 'https://api.openai.com/v1'
                }
                className="w-full px-3 py-2 pr-8 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
              {config.baseUrl && (
                <button
                  onClick={() => handleField('baseUrl', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/40 hover:text-text-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Model */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Model
            </label>

            {/* Dropdown */}
            <div className="relative">
              <select
                value={selectedPreset ? config.model : '__custom__'}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    handleField('model', '')
                  } else {
                    handleField('model', e.target.value)
                  }
                }}
                className="w-full appearance-none px-3 py-2 pr-8 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all cursor-pointer"
              >
                {modelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}{m.note ? ` — ${m.note}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>

            {/* Custom model input — shown when "Custom model..." selected or model not recognized */}
            {isCustomModel && (
              <div className="mt-1">
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => handleField('model', e.target.value)}
                  placeholder="e.g. Minimax2.7, MiniMax-Text-01"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            )}
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${config.apiKey ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-text-secondary/60">
              {config.apiKey
                ? `Configured for ${config.provider === 'minimax' ? 'MiniMax' : 'OpenAI'} · ${config.model || 'custom model'}`
                : '⚠️ No API key — generation will fail'}
            </span>
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