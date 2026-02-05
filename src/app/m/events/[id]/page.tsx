'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, FileText, Calendar, Clock, User, Trash2, Pencil, X, Check } from 'lucide-react'

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
  parent?: {
    name: string
    parent?: {
      name: string
    }
  }
}

interface EventFile {
  id: string
  fileUrl: string
  fileType: string
  fileName?: string
}

interface CreatedBy {
  name?: string
  employee?: {
    firstName: string
    lastName: string
  }
}

interface Event {
  id: string
  eventType: string
  eventDate: string
  description: string
  createdAt: string
  projectId: string
  project?: Project
  files?: EventFile[]
  createdBy?: CreatedBy
}

export default function MobileEventViewPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Edit form state
  const [editEventType, setEditEventType] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  useEffect(() => {
    if (params?.id) {
      fetchEvent()
    }
  }, [params?.id])

  const fetchEvent = async () => {
    setLoading(true)
    const res = await fetch('/api/events/' + params?.id)
    if (res.ok) {
      const data = await res.json()
      setEvent(data)
      // Initialize edit form
      setEditEventType(data.eventType)
      setEditDescription(data.description)
      const eventDate = new Date(data.eventDate)
      setEditDate(eventDate.toISOString().split('T')[0])
      setEditTime(eventDate.toTimeString().slice(0, 5))
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('האם למחוק את האירוע?')) return
    
    setDeleting(true)
    try {
      const res = await fetch('/api/events/' + params?.id, { method: 'DELETE' })
      if (res.ok) {
        router.push('/m/events')
      } else {
        alert('שגיאה במחיקת האירוע')
      }
    } catch {
      alert('שגיאה במחיקת האירוע')
    }
    setDeleting(false)
  }

  const handleSave = async () => {
    if (!editDescription.trim()) {
      alert('נא למלא תיאור')
      return
    }

    setSaving(true)
    try {
      const eventDateTime = new Date(editDate + 'T' + editTime)
      
      const res = await fetch('/api/events/' + params?.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: editEventType,
          description: editDescription,
          eventDate: eventDateTime.toISOString(),
          projectId: event?.projectId
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setEvent(updated)
        setIsEditing(false)
      } else {
        alert('שגיאה בשמירת האירוע')
      }
    } catch {
      alert('שגיאה בשמירת האירוע')
    }
    setSaving(false)
  }

  const handleCancelEdit = () => {
    if (event) {
      setEditEventType(event.eventType)
      setEditDescription(event.description)
      const eventDate = new Date(event.eventDate)
      setEditDate(eventDate.toISOString().split('T')[0])
      setEditTime(eventDate.toTimeString().slice(0, 5))
    }
    setIsEditing(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric', month: 'long', year: 'numeric'
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
    const parts: string[] = []
    if (project.parent?.parent) parts.push(project.parent.parent.name)
    if (project.parent) parts.push(project.parent.name)
    parts.push(project.name)
    return parts.join(' / ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-gray-500 mb-4">האירוע לא נמצא</div>
        <button
          onClick={() => router.push('/m/events')}
          className="text-[#1e3a5f] underline"
        >
          חזרה לרשימה
        </button>
      </div>
    )
  }

  const createdByName = event.createdBy?.employee 
    ? event.createdBy.employee.firstName + ' ' + event.createdBy.employee.lastName
    : event.createdBy?.name || '-'

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-[52px] bg-gray-50 px-4 py-3 border-b flex items-center justify-between z-40">
        <button
          onClick={() => router.push('/m/events')}
          className="flex items-center gap-1 text-[#1e3a5f]"
        >
          <ArrowRight size={20} />
          <span>חזרה</span>
        </button>
        
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 text-gray-600"
              >
                <X size={18} />
                <span>ביטול</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 text-green-600 disabled:opacity-50"
              >
                <Check size={18} />
                <span>{saving ? 'שומר...' : 'שמור'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-[#1e3a5f]"
              >
                <Pencil size={18} />
                <span>ערוך</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-red-600 disabled:opacity-50"
              >
                <Trash2 size={18} />
                <span>{deleting ? 'מוחק...' : 'מחק'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Event Type */}
        <div>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEditEventType(type.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    editEventType === type.value
                      ? type.color + ' ring-2 ring-offset-1 ring-[#1e3a5f]'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {type.value}
                </button>
              ))}
            </div>
          ) : (
            <span className={'inline-block px-3 py-1.5 rounded-full text-sm font-medium ' + getEventTypeColor(event.eventType)}>
              {event.eventType}
            </span>
          )}
        </div>

        {/* Project (read-only) */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">פרויקט</div>
          <div className="font-medium text-[#1e3a5f]">
            <span dir="ltr">#{event.project?.projectNumber}</span> {getProjectName(event.project)}
          </div>
        </div>

        {/* Date & Time */}
        {isEditing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Calendar size={16} />
                <span className="text-xs">תאריך אירוע</span>
              </div>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg p-2"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Clock size={16} />
                <span className="text-xs">שעה</span>
              </div>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg p-2"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar size={16} />
                <span className="text-xs">תאריך אירוע</span>
              </div>
              <div className="font-medium">{formatDate(event.eventDate)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock size={16} />
                <span className="text-xs">שעה</span>
              </div>
              <div className="font-medium">{formatTime(event.eventDate)}</div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-2">תיאור</div>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none"
              placeholder="תיאור האירוע..."
            />
          ) : (
            <p className="text-gray-800 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>

        {/* Files (read-only) */}
        {event.files && event.files.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-3">קבצים מצורפים ({event.files.length})</div>
            <div className="grid grid-cols-2 gap-3">
              {event.files.map((file) => {
                const fileUrl = '/api/file?url=' + encodeURIComponent(file.fileUrl)
                if (file.fileType === 'image') {
                  return (
                    <a
                      key={file.id}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={fileUrl}
                        alt=""
                        className="w-full h-32 object-cover rounded-xl"
                      />
                    </a>
                  )
                }
                return (
                  <a
                    key={file.id}
                    href={fileUrl + '&download=true'}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl h-32"
                  >
                    <FileText size={32} className="text-red-500" />
                    <span className="text-xs text-gray-600 text-center truncate w-full">
                      {file.fileName || 'PDF'}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} />
            <span>הוזן ע״י: {createdByName}</span>
          </div>
          <div>תאריך הזנה: {formatDate(event.createdAt)} {formatTime(event.createdAt)}</div>
        </div>
      </div>
    </div>
  )
}