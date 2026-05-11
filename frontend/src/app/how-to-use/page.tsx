'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, Zap, Upload, FileText, Download, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'

const STEPS = [
  {
    number: 1,
    icon: <Settings className="w-5 h-5" />,
    title: 'Configure your LLM',
    description: 'Click the ⚙️ gear icon in the top-right corner. Choose your provider (OpenAI or MiniMax), enter your API key, and select a model from the dropdown. Click Save Settings.',
    tip: 'Your API key is stored securely on the backend and never leaves your machine.',
  },
  {
    number: 2,
    icon: <FileText className="w-5 h-5" />,
    title: 'Fill in the Discovery Form',
    description: 'On the left panel, provide the feature name and business objective (required), plus any additional context: problem statement, success metrics, constraints, and assumptions.',
    tip: 'The more context you provide, the more accurate and relevant the generated artifacts will be.',
  },
  {
    number: 3,
    icon: <Upload className="w-5 h-5" />,
    title: '(Optional) Attach files',
    description: 'Drag and drop or upload supporting files — mockups, screenshots, PRD documents, or data exports. Files are base64-encoded and sent to the LLM as context.',
    tip: 'Supported types: images (PNG, JPG, WEBP), PDFs, and plain text.',
  },
  {
    number: 4,
    icon: <Zap className="w-5 h-5" />,
    title: 'Generate Delivery Artifacts',
    description: "Click the blue Generate button. Watch each module stream in live — Epic Map first, then User Stories, QA Scenarios, Analytics Events, and Risks. You don't need to wait for everything to finish; results appear as they complete.",
    tip: 'If you want to change only one section, use the 🔄 button on that tab instead of re-running everything.',
  },
  {
    number: 5,
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Review and Edit',
    description: 'All generated content is fully editable inline. Add new acceptance criteria to user stories, change priorities on the epic map, adjust QA steps, or add missing analytics events.',
    tip: 'Use the AI Reviewer panel on the right — it flags gaps, unvalidated assumptions, and risks you may have missed.',
  },
  {
    number: 6,
    icon: <Download className="w-5 h-5" />,
    title: 'Export',
    description: 'Click any section\'s export button to copy as Markdown, download JSON, or download a Jira-compatible CSV. Or use Export All at the top to download a zip containing everything.',
    tip: 'Jira CSV can be imported directly into Jira Issue Collector or bulk-created via Jira API.',
  },
]

const TROUBLESHOOTING = [
  {
    symptom: 'Nothing happens when I click Generate',
    causes: [
      'Feature Title or Business Objective is empty — both are required',
      'Backend server is not running — start it with: `cd backend && python3 -m uvicorn main:app --port 8000`',
      'API key not configured — click ⚙️ and enter your API key',
      'Wrong API key — verify it in the Settings modal',
    ],
    solution: 'Check the red error toast that appears. If no toast shows, open browser DevTools (F12 → Console) for error details.',
  },
  {
    symptom: 'Generation fails with "Connection failed"',
    causes: [
      'Backend not running on port 8000',
      'CORS policy blocking requests — the frontend runs on port 3000 by default',
      'Firewall blocking local connections',
    ],
    solution: 'Make sure both `npm run dev` (frontend, port 3000) and `uvicorn main:app` (backend, port 8000) are running in separate terminals.',
  },
  {
    symptom: 'Output is generic or irrelevant',
    causes: [
      'Not enough context in the Discovery Form',
      'Wrong model selected for the provider',
      'API key is for a different provider than selected',
    ],
    solution: 'Add more detail to Business Objective and Problem Statement. Check that the model matches your API key (e.g., MiniMax token ≠ OpenAI key).',
  },
  {
    symptom: 'Settings keep resetting after restart',
    causes: [
      'The config.json file is not persisting',
      'Backend is running from a different directory than expected',
    ],
    solution: 'Check that backend/config.json exists and is writable. Restart the backend from the backend/ directory.',
  },
  {
    symptom: 'Model dropdown shows empty or "Custom"',
    causes: [
      'Model not recognized — enter it manually or select from dropdown',
      'Saved config has an unknown model value',
    ],
    solution: 'Use the dropdown to pick a known model, or select "Custom model..." and type the model name exactly as required by your provider.',
  },
]

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to workspace
            </Link>
            <span className="text-text-secondary/30">·</span>
            <span className="text-sm font-medium text-text-primary">How to Use</span>
          </div>
          <Link
            href="https://github.com/villapx07/AI-Product-Delivery-Copilot"
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            GitHub
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-text-primary mb-3">Forge - Delivery</h1>
          <p className="text-text-secondary text-base leading-relaxed">
            Generate complete product delivery artifacts — epics, user stories, QA scenarios, analytics events, and risk assessments — from a single feature description. Follow the steps below to get started.
          </p>
        </div>

        {/* Steps */}
        <section className="mb-14">
          <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
            <span className="text-accent text-sm font-normal">01</span>
            Getting Started
          </h2>
          <div className="flex flex-col gap-5">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  {step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      Step {step.number}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
                  {step.tip && (
                    <div className="mt-2 flex gap-2 text-xs text-text-secondary/70 bg-background border border-border rounded-lg px-3 py-2">
                      <span className="text-accent mt-0.5">💡</span>
                      <span>{step.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
            <span className="text-accent text-sm font-normal">02</span>
            Troubleshooting
          </h2>
          <div className="flex flex-col gap-6">
            {TROUBLESHOOTING.map((item, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-background flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <h3 className="text-sm font-medium text-text-primary">{item.symptom}</h3>
                </div>
                <div className="px-4 py-3 border-t border-border bg-surface">
                  <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Possible Causes</p>
                  <ul className="flex flex-col gap-1 mb-3">
                    {item.causes.map((cause, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-text-secondary/40 mt-1">•</span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Solution</p>
                  <div className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    {item.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Status */}
        <section className="mt-14">
          <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
            <span className="text-accent text-sm font-normal">03</span>
            System Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Frontend (Next.js)', port: '3000', cmd: 'npm run dev' },
              { label: 'Backend (FastAPI)', port: '8000', cmd: 'uvicorn main:app --port 8000' },
            ].map((service) => (
              <div key={service.label} className="border border-border rounded-xl px-4 py-3 bg-background">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{service.label}</span>
                  <span className="text-xs text-text-secondary/60">:{service.port}</span>
                </div>
                <code className="text-xs text-text-secondary/60">{service.cmd}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-border text-center">
          <p className="text-xs text-text-secondary/50">
            Forge - Delivery ·{' '}
            <a
              href="https://github.com/villapx07/AI-Product-Delivery-Copilot"
              target="_blank"
              className="underline hover:text-text-secondary/70"
            >
              villapx07/AI-Product-Delivery-Copilot
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}