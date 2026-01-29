'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Search, X, ChevronRight } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
  children?: Project[]
}

interface FlatProject {
  id: string
  name: string
  number: string
  indent: number
  hasChildren: boolean
  parentId?: string
}

interface ProjectSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  allowAll?: boolean
  allLabel?: string
  className?: string
}

function flattenProjects(projects: Project[], indent = 0, parentId?: string): FlatProject[] {
  const result: FlatProject[] = []
  for (const p of projects) {
    const hasChildren = !!(p.children && p.children.length > 0)
    result.push({
      id: p.id,
      name: p.name,
      number: p.projectNumber,
      indent,
      hasChildren,
      parentId
    })
    if (hasChildren) {
      result.push(...flattenProjects(p.children!, indent + 1, p.id))
    }
  }
  return result
}

export function ProjectSelector({
  value,
  onChange,
  placeholder = 'בחר פרויקט',
  required = false,
  allowAll = false,
  allLabel = 'כל הפרויקטים',
  className = '',
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.items || (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const flatProjects = flattenProjects(projects)

  // Filter by search
  const filteredProjects = search
    ? flatProjects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.number.toLowerCase().includes(search.toLowerCase())
      )
    : flatProjects

  // Apply collapse logic (only when not searching)
  const visibleProjects = search
    ? filteredProjects
    : filteredProjects.filter(p => {
        if (p.indent === 0) return true
        // Check if any ancestor is collapsed
        let current = p
        while (current.parentId) {
          if (collapsedIds.has(current.parentId)) return false
          current = flatProjects.find(fp => fp.id === current.parentId)!
        }
        return true
      })

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelect = useCallback((projectId: string) => {
    onChange(projectId)
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const selectedProject = flatProjects.find(p => p.id === value)
  const displayValue = selectedProject
    ? `#${selectedProject.number} - ${selectedProject.name}`
    : (allowAll && !value ? allLabel : placeholder)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value / button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={`w-full p-2 border border-gray-200 rounded-lg flex items-center justify-between bg-white text-right ${
          !value && !allowAll ? 'text-gray-500' : ''
        }`}
      >
        <span className="truncate" dir="ltr">
          {value ? `#${selectedProject?.number}` : ''}
        </span>
        <span className="truncate flex-1 text-right mr-1">
          {value ? ` - ${selectedProject?.name}` : displayValue}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש לפי שם או מספר..."
                className="w-full pr-8 pl-8 py-1.5 border border-gray-200 rounded text-sm"
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-60">
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3 py-2 text-right hover:bg-gray-50 ${
                  !value ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                {allLabel}
              </button>
            )}
            {visibleProjects.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                לא נמצאו פרויקטים
              </div>
            )}
            {visibleProjects.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className={`w-full px-3 py-2 text-right hover:bg-gray-50 flex items-center ${
                  p.id === value ? 'bg-blue-50 text-blue-700' : ''
                }`}
                style={{ paddingRight: `${12 + p.indent * 16}px` }}
              >
                {!search && p.hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => toggleCollapse(p.id, e)}
                    className="mr-1 p-0.5 hover:bg-gray-200 rounded"
                  >
                    <ChevronRight
                      size={14}
                      className={`text-gray-400 transition-transform ${
                        collapsedIds.has(p.id) ? '' : 'rotate-90'
                      }`}
                    />
                  </button>
                )}
                <span className="truncate">
                  <span dir="ltr" className="text-gray-500">#{p.number}</span>
                  {' - '}
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectSelector
