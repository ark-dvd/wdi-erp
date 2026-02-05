'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Trash2, Loader2, FileText, Image as ImageIcon, Upload, X } from 'lucide-react'

const EVENT_TYPES = ['אדמיניסטרציה', 'אתגר', 'בטיחות', 'גבייה', 'החלטה', 'לקוח', 'לקחים', 'סיכום פגישה', 'תיעוד', 'אחר']

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

  // File editing state
  const [existingFiles, setExistingFiles] = useState<any[]>([])
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<{ file: File; preview?: string }[]>([])
  const [uploading, setUploading] = useState(false)

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
        setExistingFiles(data.files || [])
        setFilesToDelete([])
        setNewFiles([])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', `projects/${event.project?.id}/events`)
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

  const handleSave = async () => {
    setSaving(true)
    try {
      // Upload new files
      let filesToAdd: any[] = []
      if (newFiles.length > 0) {
        setUploading(true)
        filesToAdd = await Promise.all(newFiles.map(f => uploadFile(f.file)))
        setUploading(false)
      }

      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: formType,
          description: formDescription,
          eventDate: formDate,
          filesToDelete,
          filesToAdd,
        }),
      })
      if (res.ok) {
        await fetchEvent()
        setIsEditing(false)
      } else {
        const data = await res.json()
        alert(data.error || 'שגיאה בשמירה')
      }
    } catch (error) {
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
      setUploading(false)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const remainingFiles = existingFiles.filter(f => !filesToDelete.includes(f.id)).length
    const totalAfter = remainingFiles + newFiles.length + selectedFiles.length
    if (totalAfter > 5) {
      alert('ניתן להעלות עד 5 קבצים')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    const validFiles = selectedFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`סוג קובץ לא נתמך: ${file.name}`)
        return false
      }
      return true
    })

    const newFileObjects = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    setNewFiles(prev => [...prev, ...newFileObjects])
  }

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
      const updated = [...prev]
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!)
      updated.splice(index, 1)
      return updated
    })
  }

  const markFileForDeletion = (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }

  const unmarkFileForDeletion = (fileId: string) => {
    setFilesToDelete(prev => prev.filter(id => id !== fileId))
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setFormType(event.eventType)
    setFormDescription(event.description)
    setFormDate(event.eventDate?.split('T')[0] || '')
    setExistingFiles(event.files || [])
    setFilesToDelete([])
    newFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setNewFiles([])
  }

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
              <button onClick={cancelEditing} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                קבצים
                <span className="text-gray-400 font-normal"> (עד 5)</span>
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                {/* Existing files */}
                {existingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {existingFiles.map((file: any) => {
                      const isMarkedForDeletion = filesToDelete.includes(file.id)
                      const fileUrl = '/api/file?url=' + encodeURIComponent(file.fileUrl)
                      return (
                        <div key={file.id} className={`relative ${isMarkedForDeletion ? 'opacity-40' : ''}`}>
                          {file.fileType === 'image' ? (
                            <img src={fileUrl} alt={file.fileName} className="h-20 w-20 object-cover rounded" />
                          ) : (
                            <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                              <FileText size={24} className="text-gray-400" />
                            </div>
                          )}
                          {isMarkedForDeletion ? (
                            <button
                              type="button"
                              onClick={() => unmarkFileForDeletion(file.id)}
                              className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-1"
                              title="בטל מחיקה"
                            >
                              <X size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markFileForDeletion(file.id)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                              title="סמן למחיקה"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* New files to upload */}
                {newFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {newFiles.map((f, i) => (
                      <div key={i} className="relative">
                        {f.preview ? (
                          <img src={f.preview} alt="" className="h-20 w-20 object-cover rounded border-2 border-green-400" />
                        ) : (
                          <div className="h-20 w-20 bg-green-50 rounded flex items-center justify-center border-2 border-green-400">
                            <FileText size={24} className="text-green-500" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Upload button */}
                {(existingFiles.filter(f => !filesToDelete.includes(f.id)).length + newFiles.length) < 5 && (
                  <label className="flex flex-col items-center justify-center cursor-pointer gap-2 py-4">
                    <Upload size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-500">לחץ להעלאה</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
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
                event.eventType === 'לקחים' ? 'bg-amber-100 text-amber-800' :
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
