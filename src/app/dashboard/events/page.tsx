'use client'

// Version: 20260116-060000
// Fix: Fetch all events, sticky table header, Pagination (50 per page)

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, FileText, ChevronDown, ChevronLeft, X, Upload, Trash2, Pencil } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'אתגר', color: 'bg-red-100 text-red-800' },
  { value: 'תיעוד', color: 'bg-green-100 text-green-800' },
  { value: 'החלטה', color: 'bg-blue-100 text-blue-800' },
  { value: 'לקוח', color: 'bg-purple-100 text-purple-800' },
  { value: 'בטיחות', color: 'bg-orange-100 text-orange-800' },
  { value: 'סיכום פגישה', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'אדמיניסטרציה', color: 'bg-teal-100 text-teal-800' },
  { value: 'גבייה', color: 'bg-pink-100 text-pink-800' },
  { value: 'מייל', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'אחר', color: 'bg-gray-100 text-gray-800' },
]

const ITEMS_PER_PAGE = 50

function EventsContent() {
  const searchParams = useSearchParams()
  
  const [events, setEvents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({})
  
  const [selectedProject, setSelectedProject] = useState(searchParams?.get('projectId') || '')
  const [selectedType, setSelectedType] = useState('')
  const [searchText, setSearchText] = useState('')
  
  // Pagination
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [formProject, setFormProject] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formTime, setFormTime] = useState(new Date().toTimeString().slice(0, 5))
  const [formType, setFormType] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFiles, setFormFiles] = useState<{ file: File; preview?: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProjects() }, [])
  useEffect(() => { fetchEvents() }, [selectedProject, selectedType])
  
  // Reset page when filters change
  useEffect(() => { setPage(1) }, [selectedProject, selectedType, searchText])

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
  }

  const fetchEvents = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedProject) params.set('project', selectedProject)
    if (selectedType) params.set('type', selectedType)
    params.set('limit', '1000')
    const res = await fetch('/api/events?' + params.toString())
    if (res.ok) {
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : data.events || [])
    }
    setLoading(false)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('האם למחוק את האירוע?')) return
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) setEvents(prev => prev.filter(e => e.id !== eventId))
      else alert('שגיאה במחיקת האירוע')
    } catch (error) { alert('שגיאה במחיקת האירוע') }
  }

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800'
  }

  const getFullProjectName = (project: any) => {
    if (!project) return { parts: [], number: '' }
    const parts: string[] = []
    if (project.parent?.parent) parts.push(project.parent.parent.name)
    if (project.parent) parts.push(project.parent.name)
    parts.push(project.name)
    return { parts, number: project.projectNumber }
  }

  const flatProjects: { id: string; name: string; number: string; indent: number }[] = []
  projects.forEach(p => {
    flatProjects.push({ id: p.id, name: p.name, number: p.projectNumber, indent: 0 })
    if (p.children) {
      p.children.forEach((c: any) => {
        flatProjects.push({ id: c.id, name: c.name, number: c.projectNumber, indent: 1 })
        if (c.children) {
          c.children.forEach((b: any) => {
            flatProjects.push({ id: b.id, name: b.name, number: b.projectNumber, indent: 2 })
          })
        }
      })
    }
  })

  const filteredEvents = events.filter(event => {
    if (!searchText) return true
    return event.description?.includes(searchText) ||
           event.project?.name?.includes(searchText) ||
           event.project?.projectNumber?.includes(searchText)
  })
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)
  const paginatedEvents = filteredEvents.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (formFiles.length + selectedFiles.length > 5) {
      alert('ניתן להעלות עד 5 קבצים')
      return
    }
    const allowedTypes = formType === 'סיכום פגישה'
      ? ['application/pdf']
      : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const validFiles = selectedFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert('סוג קובץ לא נתמך: ' + file.name)
        return false
      }
      return true
    })
    const newFiles = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    setFormFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFormFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFile = async (file: File, projectId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'projects/' + projectId + '/events')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('שגיאה בהעלאת קובץ')
    const data = await res.json()
    return {
      fileUrl: data.url,
      fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
      fileName: file.name,
      fileSize: file.size
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProject) { alert('נא לבחור פרויקט'); return }
    if (!formType) { alert('נא לבחור סוג אירוע'); return }
    if (!formDescription) { alert('נא להזין תיאור'); return }
    if ((formType === 'תיעוד' || formType === 'בטיחות') && formFiles.length === 0) {
      alert('אירוע מסוג זה חייב לכלול לפחות תמונה אחת')
      return
    }
    if (formType === 'סיכום פגישה' && formFiles.length === 0) {
      alert('סיכום פגישה חייב לכלול קובץ PDF')
      return
    }
    setSaving(true)
    try {
      const uploadedFiles = await Promise.all(formFiles.map(f => uploadFile(f.file, formProject)))
      const eventDateTime = formDate + 'T' + formTime + ':00'
      const res = await fetch('/api/projects/' + formProject + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate: eventDateTime,
          eventType: formType,
          description: formDescription,
          files: uploadedFiles
        })
      })
      if (res.ok) {
        setFormProject('')
        setFormDate(new Date().toISOString().split('T')[0])
        setFormTime(new Date().toTimeString().slice(0, 5))
        setFormType('')
        setFormDescription('')
        formFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview))
        setFormFiles([])
        setShowForm(false)
        fetchEvents()
      } else {
        const data = await res.json()
        alert(data.error || 'שגיאה בשמירת האירוע')
      }
    } catch (error) {
      alert('שגיאה בהעלאת הקבצים')
    }
    setSaving(false)
  }

  const isPdfOnly = formType === 'סיכום פגישה'
  const requiresFile = formType === 'תיעוד' || formType === 'בטיחות' || formType === 'סיכום פגישה'

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh)]">
      {/* Sticky Top Section */}
      <div className="flex-shrink-0 bg-[#f5f6f8] p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#3a3a3d]">יומן אירועים</h1>
            <p className="text-[#8f8f96] mt-1">{filteredEvents.length} אירועים</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'ביטול' : 'אירוע חדש'}
          </button>
        </div>

        {/* New Event Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-blue-200 p-4">
            <h3 className="font-semibold mb-4">אירוע חדש</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">פרויקט *</label>
                <select value={formProject} onChange={(e) => setFormProject(e.target.value)} className="w-full p-2 border rounded-lg" required>
                  <option value="">בחר פרויקט</option>
                  {flatProjects.map(p => (
                    <option key={p.id} value={p.id}>{'  '.repeat(p.indent)}#{p.number} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תאריך *</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שעה *</label>
                <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סוג אירוע *</label>
                <select value={formType} onChange={(e) => { setFormType(e.target.value); setFormFiles([]) }} className="w-full p-2 border rounded-lg" required>
                  <option value="">בחר סוג</option>
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.value}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">תיאור *</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full p-2 border rounded-lg min-h-[80px]" required />
            </div>
            {formType && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  {isPdfOnly ? 'קובץ PDF' : 'תמונות/קבצים'}
                  {requiresFile && ' *'}
                  <span className="text-gray-400 font-normal"> (עד 5)</span>
                </label>
                <div className="border-2 border-dashed rounded-lg p-3 bg-white">
                  {formFiles.length < 5 && (
                    <label className="flex items-center justify-center cursor-pointer gap-2 py-2">
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-sm text-gray-500">לחץ להעלאה</span>
                      <input type="file" accept={isPdfOnly ? '.pdf' : 'image/*,.pdf'} multiple={!isPdfOnly} onChange={handleFileSelect} className="hidden" />
                    </label>
                  )}
                  {formFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formFiles.map((f, i) => (
                        <div key={i} className="relative">
                          {f.preview ? (
                            <img src={f.preview} alt="" className="h-16 w-16 object-cover rounded" />
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                              <FileText size={20} className="text-gray-400" />
                            </div>
                          )}
                          <button type="button" onClick={() => removeFile(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'שומר...' : 'שמור אירוע'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">ביטול</button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">פרויקט</label>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                <option value="">כל הפרויקטים</option>
                {flatProjects.map(p => (
                  <option key={p.id} value={p.id}>{'  '.repeat(p.indent)}#{p.number} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סוג אירוע</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                <option value="">כל הסוגים</option>
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.value}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="חיפוש בתיאור, שם פרויקט..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full pr-10 p-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Table Header - Sticky */}
        <div className="bg-white rounded-t-xl border border-b-0 border-[#e2e4e8]">
          <div className="hidden md:grid grid-cols-[280px_130px_100px_1fr_100px_130px_100px_80px] gap-2 px-4 py-3 bg-[#f5f6f8] text-sm font-medium text-[#3a3a3d] rounded-t-xl">
            <div>פרויקט</div>
            <div>תאריך אירוע</div>
            <div>סוג</div>
            <div>תיאור</div>
            <div>קבצים</div>
            <div>הוזן בתאריך</div>
            <div>הוזן ע"י</div>
            <div>פעולות</div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">טוען...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e4e8] text-center py-12 text-gray-500">לא נמצאו אירועים</div>
        ) : (
          <>
            <div className="bg-white rounded-b-xl border border-t-0 border-[#e2e4e8]">
              {/* Events List */}
              <div className="divide-y divide-[#e2e4e8]">
                {paginatedEvents.map(event => {
                  const isExpanded = expandedEvents[event.id]
                  const { parts, number } = getFullProjectName(event.project)
                  return (
                    <div key={event.id}>
                      <div className="grid grid-cols-1 md:grid-cols-[280px_130px_100px_1fr_100px_130px_100px_80px] gap-2 p-4 cursor-pointer hover:bg-[#f5f6f8] items-center transition-colors" onClick={() => toggleExpand(event.id)}>
                        <div className="flex items-start gap-2">
                          {isExpanded ? <ChevronDown size={16} className="mt-1 text-gray-400" /> : <ChevronLeft size={16} className="mt-1 text-gray-400" />}
                          <Link href={'/dashboard/projects/' + event.project?.id} onClick={(e) => e.stopPropagation()} className="hover:underline">
                            <div className="text-xs text-gray-500 text-right" dir="ltr">#{number}</div>
                            <div className="font-semibold text-blue-600 text-right">{parts.join(' / ')}</div>
                          </Link>
                        </div>
                        <div className="text-sm text-gray-600">{formatDateTime(event.eventDate)}</div>
                        <div><span className={'px-2 py-1 rounded text-xs ' + getEventTypeColor(event.eventType)}>{event.eventType}</span></div>
                        <div className="text-sm truncate">{event.description}</div>
                        <div className="flex items-center gap-1">
                          {event.files?.slice(0, 2).map((file: any) => {
                            const fileUrl = '/api/file?url=' + encodeURIComponent(file.fileUrl)
                            return file.fileType === 'image' ? (
                              <img key={file.id} src={fileUrl} alt="" className="h-8 w-8 object-cover rounded" />
                            ) : (
                              <div key={file.id} className="h-8 w-8 bg-red-50 rounded flex items-center justify-center">
                                <FileText size={14} className="text-red-500" />
                              </div>
                            )
                          })}
                          {event.files?.length > 2 && <span className="text-xs text-gray-400">+{event.files.length - 2}</span>}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(event.createdAt)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {event.createdBy?.employee 
                            ? event.createdBy.employee.firstName + ' ' + event.createdBy.employee.lastName
                            : event.createdBy?.name || '-'}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); window.location.href = '/dashboard/events/' + event.id }} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded" title="עריכה"><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('האם למחוק את האירוע?')) handleDeleteEvent(event.id) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="מחיקה"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                          <p className="text-sm whitespace-pre-wrap mb-4">{event.description}</p>
                          {event.files?.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                              {event.files.map((file: any) => {
                                const fileUrl = '/api/file?url=' + encodeURIComponent(file.fileUrl)
                                return file.fileType === 'image' ? (
                                  <a key={file.id} href={fileUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={fileUrl} alt="" className="h-32 w-32 object-cover rounded hover:opacity-80" />
                                  </a>
                                ) : (
                                  <a key={file.id} href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-100 rounded hover:bg-gray-200">
                                    <FileText size={20} className="text-red-500" />
                                    <span className="text-sm">{file.fileName || 'PDF'}</span>
                                  </a>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-[#e2e4e8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  הקודם
                </button>
                <span className="px-4 py-2">עמוד {page} מתוך {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-[#e2e4e8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  הבא
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">טוען...</div>}>
      <EventsContent />
    </Suspense>
  )
}
