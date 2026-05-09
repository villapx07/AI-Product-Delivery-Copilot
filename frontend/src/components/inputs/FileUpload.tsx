'use client'

import * as React from 'react'
import { Upload, X, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  name: string
  size: number
  preview?: string
  data: string // base64
}

interface FileUploadProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

export function FileUpload({ files, onFilesChange, maxFiles = 5, maxSizeMB = 10 }: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleFiles = (fileList: FileList) => {
    const remaining = maxFiles - files.length
    const toProcess = Array.from(fileList).slice(0, remaining)

    // Read files as base64
    const readers = toProcess.map((file) => {
      return new Promise<UploadedFile>((resolve) => {
        const reader = new FileReader()
        const nf: UploadedFile = {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          size: file.size,
          data: '',
          preview: undefined,
        }
        reader.onload = (e) => {
          const result = e.target?.result as string
          nf.data = result
          if (file.type.startsWith('image/')) {
            nf.preview = result
          }
          resolve(nf)
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then((completed) => {
      onFilesChange([...files, ...completed])
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer',
          isDragging ? 'border-accent bg-accent-subtle' : 'border-border hover:border-accent/50'
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-5 h-5 text-text-secondary" />
        <p className="text-xs text-text-secondary text-center">
          Drop screenshots, Figma exports, or docs here
        </p>
        <p className="text-xs text-text-secondary/60">
          PNG, JPG, WEBP, PDF • Max {maxFiles} files • {maxSizeMB}MB each
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*,.pdf"
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border"
            >
              {file.preview ? (
                <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
              ) : (
                <Image className="w-4 h-4 text-text-secondary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-secondary">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(file.id) }}
                className="p-1 rounded hover:bg-border transition-colors"
              >
                <X className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}