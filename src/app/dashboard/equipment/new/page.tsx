// ============================================
// src/app/dashboard/equipment/new/page.tsx
// Version: 20260112-235000
// New equipment page
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Wrench, Upload, X } from 'lucide-react'

const typeOptions = [
  { value: 'LAPTOP', label: 'מחשב נייד' },
  { value: 'CHARGER', label: 'מטען למחשב' },
  { value: 'DOCKING_STATION', label: 'תחנת עגינה' },
  { value: 'MONITOR', label: 'מסך' },
  { value: 'MOUSE', label: 'עכבר' },
  { value: 'KEYBOARD', label: 'מקלדת' },
  { value: 'MONITOR_ARM', label: 'זרוע למסך' },
  { value: 'MEETING_ROOM_TV', label: 'מסך חדר ישיבות' },
  { value: 'PRINTER', label: 'מדפסת' },
  { value: 'SCANNER', label: 'סורק' },
  { value: 'OTHER', label: 'אחר' },
]

const statusOptions = [
  { value: 'ACTIVE', label: 'פעיל' },
  { value: 'INACTIVE', label: 'מושבת' },
  { value: 'IN_REPAIR', label: 'בתיקון' },
]

export default function NewEquipmentPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('LAPTOP')
  const [isOfficeEquipment, setIsOfficeEquipment] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/hr')
      .then(r => r.json())
      .then(data => setEmployees(data.filter((e: any) => e.status === 'פעיל')))
      .catch(() => {})
  }, [])

  const isScreenType = ['LAPTOP', 'MONITOR', 'MEETING_ROOM_TV'].includes(selectedType)
  const isLaptop = selectedType === 'LAPTOP'

  const handleInvoiceUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'equipment-invoices')
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
      return null
    } catch (error) {
      console.error('Error uploading invoice:', error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, any> = {}
    formData.forEach((value, key) => {
      data[key] = value || null
    })

    // Add checkbox values
    data.isOfficeEquipment = isOfficeEquipment
    data.hasTouchscreen = formData.get('hasTouchscreen') === 'on'

    // Upload invoice if selected
    if (invoiceFile) {
      const invoiceUrl = await handleInvoiceUpload(invoiceFile)
      if (invoiceUrl) {
        data.invoiceUrl = invoiceUrl
      }
    }

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const equipment = await res.json()
        router.push(`/dashboard/equipment/${equipment.id}`)
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'שגיאה ביצירת הציוד')
      }
    } catch {
      setError('שגיאה ביצירת הציוד')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/dashboard/equipment"
        className="text-[#0a3161] text-sm flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowRight size={14} /> חזרה לרשימת הציוד
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#0a3161]/10 flex items-center justify-center">
          <Wrench className="text-[#0a3161]" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0a3161]">ציוד חדש</h1>
          <p className="text-[#8f8f96]">הוספת פריט ציוד למערכת</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
          <h2 className="font-semibold text-[#0a3161] mb-4">פרטי ציוד</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">סוג ציוד *</label>
              <select
                name="type"
                required
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {selectedType === 'OTHER' && (
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">פרט סוג *</label>
                <input
                  name="typeOther"
                  required
                  placeholder="תאר את סוג הציוד"
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">יצרן *</label>
              <input
                name="manufacturer"
                required
                placeholder="Dell, Lenovo, Apple..."
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">דגם *</label>
              <input
                name="model"
                required
                placeholder="Latitude 5540, ThinkPad..."
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">מספר סריאלי</label>
              <input
                name="serialNumber"
                placeholder="S/N"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">שנת ייצור</label>
              <input
                type="number"
                name="yearOfManufacture"
                placeholder="2024"
                min="2000"
                max="2030"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            {isScreenType && (
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">גודל מסך (אינץ')</label>
                <input
                  type="number"
                  name="screenSizeInch"
                  placeholder="15.6"
                  step="0.1"
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">סטטוס</label>
              <select
                name="status"
                defaultValue="ACTIVE"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Laptop Specs */}
        {isLaptop && (
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="font-semibold text-[#0a3161] mb-4">מפרט מחשב נייד</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">מעבד</label>
                <input
                  name="processor"
                  placeholder="Intel i5-1235U, M2 Pro..."
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">זיכרון (GB)</label>
                <input
                  type="number"
                  name="ramGB"
                  placeholder="16"
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">אחסון (GB)</label>
                <input
                  type="number"
                  name="storageGB"
                  placeholder="512"
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">מערכת הפעלה</label>
                <input
                  name="operatingSystem"
                  placeholder="Windows 11 Pro, macOS..."
                  className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  name="hasTouchscreen"
                  id="hasTouchscreen"
                  className="w-4 h-4 rounded border-[#e2e4e8]"
                />
                <label htmlFor="hasTouchscreen" className="text-sm text-[#3a3a3d]">מסך מגע</label>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Info */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
          <h2 className="font-semibold text-[#0a3161] mb-4">פרטי רכישה</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">ספק</label>
              <input
                name="supplier"
                placeholder="שם הספק"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">תאריך רכישה</label>
              <input
                type="date"
                name="purchaseDate"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3a3a3d] mb-1">תפוגת אחריות</label>
              <input
                type="date"
                name="warrantyExpiry"
                className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-[#3a3a3d] mb-1">חשבונית</label>
              <div className="flex items-center gap-4">
                {invoiceFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f6f8] rounded-lg">
                    <span className="text-sm">{invoiceFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setInvoiceFile(null)}
                      className="text-[#8f8f96] hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-[#e2e4e8] rounded-lg cursor-pointer hover:bg-[#f5f6f8]">
                    <Upload size={16} className="text-[#8f8f96]" />
                    <span className="text-sm text-[#8f8f96]">העלאת חשבונית</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
          <h2 className="font-semibold text-[#0a3161] mb-4">שיוך</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  checked={!isOfficeEquipment}
                  onChange={() => setIsOfficeEquipment(false)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[#3a3a3d]">משויך לעובד</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignmentType"
                  checked={isOfficeEquipment}
                  onChange={() => setIsOfficeEquipment(true)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[#3a3a3d]">ציוד משרדי</span>
              </label>
            </div>

            {isOfficeEquipment ? (
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">מיקום</label>
                <input
                  name="location"
                  placeholder="חדר ישיבות א', קומה 2..."
                  className="w-full max-w-md border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-[#3a3a3d] mb-1">עובד</label>
                <select
                  name="currentAssigneeId"
                  className="w-full max-w-md border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                >
                  <option value="">ללא שיוך</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
          <h2 className="font-semibold text-[#0a3161] mb-4">הערות</h2>
          <textarea
            name="notes"
            rows={3}
            placeholder="הערות נוספות..."
            className="w-full border border-[#e2e4e8] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link
            href="/dashboard/equipment"
            className="px-6 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]"
          >
            ביטול
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'שומר...' : 'צור ציוד'}
          </button>
        </div>
      </form>
    </div>
  )
}
