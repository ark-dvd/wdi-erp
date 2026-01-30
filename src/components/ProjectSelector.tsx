'use client'

// Version: 20260129-VENDOR-MATCH
// Rewritten to match Vendors page project selection exactly:
// - Same API endpoint (?state=פעיל&level=main)
// - Same hierarchy with collapse/expand (default: collapsed)
// - Same icons (Layers, Building2, FolderKanban)
// - Same visual design

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronLeft, Search, X, FolderKanban, Building2, Layers } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
  children?: Project[]
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

// Helper to get icon based on project type (matching vendors page)
function getProjectIcon(project: Project) {
  // Mega project (has zone children)
  if (project.children?.some(c => /^\d{4}-[A-Z]$/.test(c.projectNumber))) {
    return <Layers size={16} className="text-[#0a3161]" />
  }
  // Building (has number suffix)
  if (/^\d{4}-\d{2}$/.test(project.projectNumber) || /^\d{4}-[A-Z]-\d{2}$/.test(project.projectNumber)) {
    return <Building2 size={16} className="text-[#0a3161]" />
  }
  // Default project
  return <FolderKanban size={16} className="text-[#0a3161]" />
}

// Find a project by ID in the hierarchy
function findProjectById(projects: Project[], id: string): Project | null {
  for (const p of projects) {
    if (p.id === id) return p
    if (p.children) {
      const found = findProjectById(p.children, id)
      if (found) return found
    }
  }
  return null
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
  const [loading, setLoading] = useState(true)
  // Default: all collapsed (empty set = nothing expanded)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
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
    setLoading(true)
    try {
      // CRITICAL: Same endpoint as vendors page - gets hierarchy with children
      const res = await fetch('/api/projects?state=פעיל&level=main')
      if (res.ok) {
        const data = await res.json()
        // MAYBACH: Handle paginated response format
        setProjects(data.items || (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Toggle project expansion
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedProjects(newExpanded)
  }

  // Search matching logic (matches vendors page)
  const matchesSearch = (p: Project): boolean => {
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.projectNumber.toLowerCase().includes(search.toLowerCase())
  }

  // Check if project or any descendants match search
  const projectOrDescendantsMatch = (p: Project): boolean => {
    if (matchesSearch(p)) return true
    if (p.children) {
      return p.children.some(c => projectOrDescendantsMatch(c))
    }
    return false
  }

  // Filtered top-level projects
  const filteredProjects = projects.filter(p => projectOrDescendantsMatch(p))

  const handleSelect = (projectId: string) => {
    onChange(projectId)
    setIsOpen(false)
    setSearch('')
  }

  const selectedProject = value ? findProjectById(projects, value) : null
  const displayValue = selectedProject
    ? `#${selectedProject.projectNumber} - ${selectedProject.name}`
    : (allowAll && !value ? allLabel : placeholder)

  // Render a single project row with expand/collapse (matching vendors page exactly)
  const renderProjectRow = (project: Project, depth: number = 0) => {
    const hasChildren = project.children && project.children.length > 0
    const isExpanded = expandedProjects.has(project.id)
    const childrenMatchSearch = hasChildren && project.children!.some(c => projectOrDescendantsMatch(c))

    // If searching and this item doesn't match but has matching children, show it expanded
    const shouldShowExpanded = search && childrenMatchSearch
    const effectivelyExpanded = isExpanded || shouldShowExpanded

    return (
      <div key={project.id}>
        <div
          className={`flex items-center gap-2 p-2 hover:bg-blue-50 transition-colors cursor-pointer ${
            value === project.id ? 'bg-blue-50 text-blue-700' : ''
          } ${depth > 0 ? 'bg-gray-50/50' : ''}`}
          style={{ paddingRight: `${8 + depth * 16}px` }}
        >
          {/* Expand/Collapse button */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (hasChildren) toggleExpand(project.id, e)
            }}
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          >
            {hasChildren ? (
              effectivelyExpanded ? (
                <ChevronDown size={14} className="text-gray-400 hover:text-[#0a3161]" />
              ) : (
                <ChevronLeft size={14} className="text-gray-400 hover:text-[#0a3161]" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>

          {/* Icon */}
          <div className="flex-shrink-0">{getProjectIcon(project)}</div>

          {/* Project info - clickable to select */}
          <div
            className="flex-1 text-right truncate"
            onClick={() => handleSelect(project.id)}
          >
            <span dir="ltr" className="text-gray-500">#{project.projectNumber}</span>
            {' - '}
            <span>{project.name}</span>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && effectivelyExpanded && (
          <div>
            {project.children!
              .filter(c => !search || projectOrDescendantsMatch(c))
              .map(child => renderProjectRow(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

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
        <span className="truncate flex-1 text-right">
          {displayValue}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 mr-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
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
          <div className="overflow-y-auto max-h-80">
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3 py-2 text-right hover:bg-gray-50 border-b border-gray-100 ${
                  !value ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                {allLabel}
              </button>
            )}

            {loading ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                טוען פרויקטים...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                לא נמצאו פרויקטים
              </div>
            ) : (
              <div className="py-1">
                {filteredProjects.map(project => renderProjectRow(project, 0))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectSelector
