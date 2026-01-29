'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Trash2, Loader2, FileText, Image as ImageIcon } from 'lucide-react'

const EVENT_TYPES = ['אתגר', 'תיעוד', 'החלטה', 'לקוח', 'בטיחות', 'סיכום פגישה', 'אדמיניסטרציה', 'גבייה', 'אחר']

export default function EventViewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [formType, setFormType] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState('')

  useEffect(() => { fetchEvent() }, [id])

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data)
        setFormType(data.eventType)
        setFormDescription(data.description)
        setFormDate(data.eventDate?.split('T')[0] || '')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: formType,
          description: formDescription,
          eventDate: formDate,
        }),
      })
      if (res.ok) {
        await fetchEvent()
        setIsEditing(false)
      } else {
        alert('שגיאה בשמירה')
      }
    } catch (error) {
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard/events')
      } else {
        alert('שגיאה במחיקה')
      }
    } catch (error) {
      alert('שגיאה במחיקה')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('he-IL')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" />
      </div>
    )
  }

  if (!event) return <div className="text-center py-12 text-gray-500">אירוע לא נמצא</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/events" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">פרטי אירוע</h1>
            <Link href={`/dashboard/projects/${event.project?.id}`} className="text-[#0a3161] hover:underline">
              <span dir="ltr">#{event.project?.projectNumber}</span> - {event.project?.name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ביטול
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                שמור
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                עריכה
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג אירוע</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={5} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                event.eventType === 'אתגר' ? 'bg-red-100 text-red-800' :
                event.eventType === 'תיעוד' ? 'bg-green-100 text-green-800' :
                event.eventType === 'החלטה' ? 'bg-blue-100 text-blue-800' :
                event.eventType === 'לקוח' ? 'bg-purple-100 text-purple-800' :
                event.eventType === 'בטיחות' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>{event.eventType}</span>
              <span className="text-gray-500">{formatDate(event.eventDate)}</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">תיאור</h3>
              <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{event.description}</p>
            </div>
            {event.files?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">קבצים ({event.files.length})</h3>
                <div className="flex flex-wrap gap-3">
                  {event.files.map((file: any) => {
                    const fileUrl = '/api/file?url=' + encodeURIComponent(file.fileUrl)
                    return file.fileType === 'image' ? (
                      <a key={file.id} href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <img src={fileUrl} alt={file.fileName} className="h-24 w-24 object-cover rounded-lg border" />
                      </a>
                    ) : (
                      <a key={file.id} href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                        <FileText size={20} className="text-red-500" />
                        <span className="text-sm">{file.fileName}</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-4">מחיקת אירוע</h3>
            <p className="text-gray-600 mb-6">האם למחוק את האירוע? פעולה זו לא ניתנת לביטול.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={deleting}>
                ביטול
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
