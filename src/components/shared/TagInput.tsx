'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function TagInput({ value, onChange, suggestions = [], placeholder = 'เพิ่มแท็ก...', className }: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-')

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  )

  function addTag(raw: string) {
    const tag = normalise(raw)
    if (!tag || value.includes(tag)) { setInput(''); return }
    onChange([...value, tag])
    setInput('')
    setHighlightIdx(-1)
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && input.trim()) {
      e.preventDefault()
      if (open && highlightIdx >= 0 && filtered[highlightIdx]) {
        addTag(filtered[highlightIdx])
      } else {
        addTag(input)
      }
      setOpen(false)
      return
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, -1))
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setHighlightIdx(-1)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors',
          'focus-within:ring-1 focus-within:ring-ring cursor-text'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 text-xs font-medium"
          >
            <Tag className="w-3 h-3 opacity-70" />
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="ml-0.5 hover:text-violet-950 dark:hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); setHighlightIdx(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground text-sm py-0.5"
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); setOpen(false) }}
              onMouseEnter={() => setHighlightIdx(i)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors',
                highlightIdx === i
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Tag className="w-3 h-3 opacity-50" />
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        กด Enter, Tab หรือ , เพื่อเพิ่มแท็ก · Backspace เพื่อลบ
      </p>
    </div>
  )
}
