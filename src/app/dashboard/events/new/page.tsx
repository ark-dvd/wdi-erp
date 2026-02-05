'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Upload, X, FileText } from 'lucide-react'
import ProjectSelector from '@/components/ProjectSelector'

const EVENT_TYPES = [
  { value: 'אדמיניסטרציה', label: 'אדמיניסטרציה' },
  { value: 'אתגר', label: 'אתגר' },
  { value: 'בטיחות', label: 'בטיחות' },
  { value: 'גבייה', label: 'גבייה' },
  { value: 'החלטה', label: 'החלטה' },
  { value: 'לקוח', label: 'לקוח' },
  { value: 'לקחים', label: 'לקחים' },
  { value: 'סיכום פגישה', label: 'סיכום פגישה' },
  { value: 'תיעוד', label: 'תיעוד' },
  { value: 'אחר', label: 'אחר' },
]

function NewEventContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams?.get('projectId') || null

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    projectId: preselectedProjectId || '',
    eventType: '',
    eventDate: new Date().toISOString().slice(0, 16),
    description: '',
  })
  const [files, setFiles] = useState<{ file: File; preview?: string }[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (files.length + selectedFiles.length > 5) {
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

    const newFiles = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFile = async (file: File, projectId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', `projects/${projectId}/events`)
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

    if (!form.projectId) {
      alert('נא לבחור פרויקט')
      return
    }
    if (!form.eventType) {
      alert('נא לבחור סוג אירוע')
      return
    }
    if (!form.description) {
      alert('נא להזין תיאור')
      return
    }

    setLoading(true)
    try {
      const uploadedFiles = await Promise.all(
        files.map(f => uploadFile(f.file, form.projectId))
      )

      const res = await fetch(`/api/projects/${form.projectId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: form.eventType,
          eventDate: form.eventDate,
          description: form.description,
          files: uploadedFiles
        })
      })

      if (res.ok) {
        router.push(preselectedProjectId 
          ? `/dashboard/projects/${preselectedProjectId}?tab=events`
          : '/dashboard/events'
        )
      } else {
        const data = await res.json()
        alert(data.error || 'שגיאה בשמירת האירוע')
      }
    } catch (error) {
      alert('שגיאה בהעלאת הקבצים')
    } finally {
      setLoading(false)
    }
  }

  const acceptedFileTypes = 'image/jpeg,image/png,.pdf'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/events" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">אירוע חדש</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט *</label>
          <ProjectSelector
            value={form.projectId}
            onChange={(value) => setForm({ ...form, projectId: value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">סוג אירוע *</label>
          <select
            value={form.eventType}
            onChange={(e) => {
              setForm({ ...form, eventType: e.target.value })
              setFiles([])
            }}
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">בחר סוג</option>
            {EVENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">תאריך ושעה *</label>
          <input
            type="datetime-local"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">תיאור *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {form.eventType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קבצים
              <span className="text-gray-400 font-normal"> (עד 5)</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              {files.length < 5 && (
                <label className="flex flex-col items-center justify-center cursor-pointer gap-2 py-4">
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500">לחץ להעלאה</span>
                  <input
                    type="file"
                    accept={acceptedFileTypes}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {files.map((f, i) => (
                    <div key={i} className="relative">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="h-20 w-20 object-cover rounded" />
                      ) : (
                        <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                          <FileText size={24} className="text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? 'שומר...' : 'שמור אירוע'}
          </button>
          <Link href="/dashboard/events" className="btn btn-secondary">
            ביטול
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">טוען...</div>}>
      <NewEventContent />
    </Suspense>
  )
}
