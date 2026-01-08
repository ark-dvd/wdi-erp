'use client'
// src/app/dashboard/admin/import/page.tsx
// גרסה: v20251217-201000

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface ImportResults {
  organizations: { created: number; skipped: number; errors: string[] }
  contacts: { created: number; skipped: number; errors: string[] }
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ organizations: any[]; contacts: any[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const orgsSheet = workbook.Sheets['Organizations']
        const contactsSheet = workbook.Sheets['Contacts']

        if (!orgsSheet || !contactsSheet) {
          setError('הקובץ חייב להכיל גליונות "Organizations" ו-"Contacts"')
          return
        }

        const organizations = XLSX.utils.sheet_to_json(orgsSheet)
        const contacts = XLSX.utils.sheet_to_json(contactsSheet)

        setPreview({ organizations, contacts })
      } catch (err) {
        setError('שגיאה בקריאת הקובץ')
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }, [])

  const handleImport = async () => {
    if (!preview) return

    setImporting(true)
    setError(null)

    try {
      // שלב 1: ייבוא ארגונים
      const orgsResponse = await fetch('/api/organizations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizations: preview.organizations })
      })
      const orgsResult = await orgsResponse.json()

      if (!orgsResponse.ok) {
        throw new Error(orgsResult.error || 'שגיאה בייבוא ארגונים')
      }

      // שלב 2: המרת אנשי קשר לפורמט API
      const contacts = preview.contacts.map((c: any) => ({
        firstName: c.firstName,
        lastName: c.lastName || '',
        phone: c.phone,
        email: c.email || null,
        contactTypes: c.contactTypes ? String(c.contactTypes).split(', ') : ['יועץ'],
        disciplines: c.disciplines ? String(c.disciplines).split(', ') : [],
        organizationName: c.organization || null,
        notes: c.source ? `מקור: ${c.source}` : null
      }))

      // שלב 3: ייבוא אנשי קשר
      const contactsResponse = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts })
      })
      const contactsResult = await contactsResponse.json()

      if (!contactsResponse.ok) {
        throw new Error(contactsResult.error || 'שגיאה בייבוא אנשי קשר')
      }

      setResults({
        organizations: {
          created: orgsResult.created || 0,
          skipped: orgsResult.skipped || 0,
          errors: orgsResult.errors || []
        },
        contacts: {
          created: contactsResult.created || 0,
          skipped: contactsResult.skipped || 0,
          errors: contactsResult.errors || []
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייבוא')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">ייבוא אנשי קשר וארגונים</h1>

      <div className="mb-6 p-4 border-2 border-dashed rounded-lg">
        <label className="block">
          <span className="text-gray-700 font-medium">בחר קובץ Excel:</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="mt-2 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
              file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </label>
        <p className="mt-2 text-sm text-gray-500">
          הקובץ חייב להכיל גליונות בשם "Organizations" ו-"Contacts"
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {preview && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-bold mb-2">תצוגה מקדימה:</h2>
          <div className="grid grid-cols-2 gap-4">
            <p className="text-lg">
              <span className="font-medium">ארגונים:</span>{' '}
              <span className="text-blue-600">{preview.organizations.length}</span>
            </p>
            <p className="text-lg">
              <span className="font-medium">אנשי קשר:</span>{' '}
              <span className="text-blue-600">{preview.contacts.length}</span>
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg 
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'מייבא...' : 'התחל ייבוא'}
          </button>
        </div>
      )}

      {results && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="font-bold text-green-800 mb-2">✅ הייבוא הושלם!</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-white rounded">
              <h3 className="font-medium">ארגונים:</h3>
              <p>נוצרו: <span className="text-green-600 font-bold">{results.organizations.created}</span></p>
              <p>דולגו: <span className="text-gray-600">{results.organizations.skipped}</span></p>
            </div>
            <div className="p-3 bg-white rounded">
              <h3 className="font-medium">אנשי קשר:</h3>
              <p>נוצרו: <span className="text-green-600 font-bold">{results.contacts.created}</span></p>
              <p>דולגו: <span className="text-gray-600">{results.contacts.skipped}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
