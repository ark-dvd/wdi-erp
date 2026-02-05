'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, FileText, ChevronLeft, Filter } from 'lucide-react'
import ProjectSelector from '@/components/ProjectSelector'

const EVENT_TYPES = [
  { value: 'אדמיניסטרציה', color: 'bg-teal-100 text-teal-800' },
  { value: 'אתגר', color: 'bg-red-100 text-red-800' },
  { value: 'בטיחות', color: 'bg-orange-100 text-orange-800' },
  { value: 'גבייה', color: 'bg-pink-100 text-pink-800' },
  { value: 'החלטה', color: 'bg-blue-100 text-blue-800' },
  { value: 'לקוח', color: 'bg-purple-100 text-purple-800' },
  { value: 'לקחים', color: 'bg-amber-100 text-amber-800' },
  { value: 'סיכום פגישה', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'תיעוד', color: 'bg-green-100 text-green-800' },
  { value: 'מייל', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'אחר', color: 'bg-gray-100 text-gray-800' },
]

interface Project {
  id: string
  name: string
  projectNumber: string
  children?: Project[]
  parent?: Project
}

interface EventFile {
  id: string
  fileUrl: string
  fileType: string
  fileName?: string
}

interface Event {
  id: string
  eventType: string
  eventDate: string
  description: string
  project?: Project
  files?: EventFile[]
}

export default function MobileEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => { fetchEvents() }, [selectedProject, selectedType])

  const fetchEvents = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedProject) params.set('projectId', selectedProject)
    if (selectedType) params.set('eventType', selectedType)
    const res = await fetch('/api/events?' + params.toString())
    if (res.ok) {
      const data = await res.json()
      setEvents(data.items || (Array.isArray(data) ? data : []))
    }
    setLoading(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric', month: 'short'
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800'
  }

  const getProjectName = (project?: Project) => {
    if (!project) return ''
    if (project.parent?.parent) return project.parent.parent.name + ' / ' + project.name
    if (project.parent) return project.parent.name + ' / ' + project.name
    return project.name
  }


  const filteredEvents = events.filter(event => {
    if (!searchText) return true
    return event.description?.includes(searchText) ||
           event.project?.name?.includes(searchText) ||
           event.project?.projectNumber?.includes(searchText)
  })

  const activeFiltersCount = (selectedProject ? 1 : 0) + (selectedType ? 1 : 0)

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Search & Filter Bar */}
      <div className="sticky top-[52px] bg-gray-50 px-4 py-3 space-y-3 z-40 border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="חיפוש..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={'px-4 py-2.5 rounded-xl border flex items-center gap-2 ' + 
              (activeFiltersCount > 0 ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white border-gray-200')}
          >
            <Filter size={18} />
            {activeFiltersCount > 0 && (
              <span className="bg-white text-[#1e3a5f] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="space-y-3 pt-2">
            <ProjectSelector
              value={selectedProject}
              onChange={setSelectedProject}
              allowAll
              allLabel="כל הפרויקטים"
              className="text-sm"
            />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm"
            >
              <option value="">כל הסוגים</option>
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.value}</option>
              ))}
            </select>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setSelectedProject(''); setSelectedType('') }}
                className="text-sm text-red-600 underline"
              >
                נקה פילטרים
              </button>
            )}
          </div>
        )}
      </div>

      {/* Events Count */}
      <div className="px-4 py-2 text-sm text-gray-500">
        {filteredEvents.length} אירועים
      </div>

      {/* Events List */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">טוען...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">לא נמצאו אירועים</div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => (
              <Link
                key={event.id}
                href={'/m/events/' + event.id}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={'px-2 py-1 rounded text-xs ' + getEventTypeColor(event.eventType)}>
                    {event.eventType}
                  </span>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {formatDate(event.eventDate)}
                    <span className="text-gray-300">|</span>
                    {formatTime(event.eventDate)}
                  </div>
                </div>
                
                <div className="text-sm font-medium text-[#1e3a5f] mb-1">
                  <span dir="ltr">#{event.project?.projectNumber}</span> {getProjectName(event.project)}
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {event.description}
                </p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    {event.files && event.files.length > 0 && (
                      <>
                        {event.files.slice(0, 3).map((file, idx) => (
                          file.fileType === 'image' ? (
                            <img
                              key={idx}
                              src={'/api/file?url=' + encodeURIComponent(file.fileUrl)}
                              alt=""
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <div key={idx} className="h-8 w-8 bg-red-50 rounded flex items-center justify-center">
                              <FileText size={14} className="text-red-500" />
                            </div>
                          )
                        ))}
                        {event.files.length > 3 && (
                          <span className="text-xs text-gray-400">+{event.files.length - 3}</span>
                        )}
                      </>
                    )}
                  </div>
                  <ChevronLeft size={18} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}