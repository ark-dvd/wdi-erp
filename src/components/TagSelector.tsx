'use client'

import { Check } from 'lucide-react'

interface TagSelectorProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  multiple?: boolean
  columns?: 1 | 2 | 3 | 4
}

export default function TagSelector({
  options,
  selected,
  onChange,
  multiple = true,
  columns = 3
}: TagSelectorProps) {
  
  const toggleOption = (option: string) => {
    if (multiple) {
      if (selected.includes(option)) {
        onChange(selected.filter(s => s !== option))
      } else {
        onChange([...selected, option])
      }
    } else {
      // Single selection - toggle or replace
      if (selected.includes(option)) {
        onChange([])
      } else {
        onChange([option])
      }
    }
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-2`}>
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
              transition-all duration-150 text-right
              ${isSelected 
                ? 'bg-[#0a3161]/10 text-[#0a3161] ring-2 ring-[#0a3161]' 
                : 'bg-[#f5f6f8] text-[#3a3a3d] hover:bg-[#ebedf0]'
              }
            `}
          >
            {isSelected && (
              <Check size={16} className="shrink-0" />
            )}
            <span className="flex-1">{option}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ==========================================
   Grouped Tag Selector - לסוגי מבנים
   ========================================== */

interface GroupedTagSelectorProps {
  groups: Record<string, string[]>
  selected: string[]
  onChange: (selected: string[]) => void
}

export function GroupedTagSelector({
  groups,
  selected,
  onChange
}: GroupedTagSelectorProps) {
  
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const getGroupSelectedCount = (types: string[]) => {
    return types.filter(t => selected.includes(t)).length
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, options]) => {
        const selectedCount = getGroupSelectedCount(options)
        return (
          <div key={groupName} className="border border-[#e2e4e8] rounded-lg overflow-hidden">
            {/* Group Header */}
            <div className="bg-[#f5f6f8] px-4 py-2 flex items-center justify-between">
              <span className="font-medium text-[#3a3a3d]">{groupName}</span>
              {selectedCount > 0 && (
                <span className="bg-[#0a3161]/10 text-[#0a3161] text-xs font-semibold px-2 py-0.5 rounded-full">
                  {selectedCount}
                </span>
              )}
            </div>
            
            {/* Group Options */}
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {options.map((option) => {
                const isSelected = selected.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
                      transition-all duration-150 text-right
                      ${isSelected 
                        ? 'bg-[#0a3161]/10 text-[#0a3161] ring-2 ring-[#0a3161]' 
                        : 'bg-[#f5f6f8] text-[#3a3a3d] hover:bg-[#ebedf0]'
                      }
                    `}
                  >
                    {isSelected && (
                      <Check size={16} className="shrink-0" />
                    )}
                    <span className="flex-1">{option}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}