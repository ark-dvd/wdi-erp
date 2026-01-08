'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, FileText, Check } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'אתגר', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'תיעוד', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'החלטה', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'לקוח', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'בטיחות', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'סיכום פגישה', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'אדמיניסטרציה', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  { value: 'גבייה', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'אחר', color: 'bg-gray-100 text-gray-800 border-gray-300' },
]

export default function MobileNewEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [projects, setProjects] = useState<any[]>([])
  const [formProject, setFormProject] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formTime, setFormTime] = useState(new Date().toTimeString().slice(0, 5))
  const [formType, setFormType] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFiles, setFormFiles] = useState<{ file: File; preview?: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
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
      return
    }
    if (formType === 'סיכום פגישה' && formFiles.length === 0) {
      return
    }

    setSaving(true)
    try {
      const uploadedFiles = await Promise.all(
        formFiles.map(f => uploadFile(f.file, formProject))
      )
      
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
        setSuccess(true)
        formFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview))
        setTimeout(() => {
          router.push('/m/events')
        }, 1500)
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

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-green-100 rounded-full p-6 mb-4">
          <Check size={48} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">האירוע נשמר בהצלחה!</h2>
        <p className="text-gray-500">מעביר לרשימת האירועים...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">אירוע חדש</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">פרויקט *</label>
          <select
            value={formProject}
            onChange={(e) => setFormProject(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm"
            required
          >
            <option value="">בחר פרויקט</option>
            {flatProjects.map(p => (
              <option key={p.id} value={p.id}>
                {'  '.repeat(p.indent)}#{p.number} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך *</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שעה *</label>
            <input
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm"
              required
            />
          </div>
        </div>

        {/* Event Type - Pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">סוג אירוע *</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => { setFormType(type.value); setFormFiles([]) }}
                className={`px-3 py-2 rounded-full text-sm border-2 transition-all ${
                  formType === type.value
                    ? type.color + ' border-current font-medium'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {type.value}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תיאור *</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="תאר את האירוע..."
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm min-h-[120px] resize-none"
            required
          />
        </div>

        {/* File Upload */}
        {formType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isPdfOnly ? 'קובץ PDF' : 'תמונות/קבצים'}
              {' *'}
              <span className="text-gray-400 font-normal"> (עד 5)</span>
            </label>

            {/* Upload Buttons */}
            {formFiles.length < 5 && (
              <div className="flex gap-3 mb-3">
                {!isPdfOnly && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-white text-gray-600"
                  >
                    <Camera size={24} />
                    <span>צלם</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-white text-gray-600"
                >
                  <Upload size={24} />
                  <span>העלה קובץ</span>
                </button>
              </div>
            )}

            {/* Hidden Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={isPdfOnly ? '.pdf' : 'image/*,.pdf'}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Previews */}
            {formFiles.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {formFiles.map((f, i) => (
                  <div key={i} className="relative">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="h-20 w-20 object-cover rounded-xl" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-100 rounded-xl flex items-center justify-center">
                        <FileText size={28} className="text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-[#1e3a5f] text-white rounded-xl font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
        >
          {saving ? 'שומר...' : 'שמור אירוע'}
        </button>
      </form>
    </div>
  )
}
