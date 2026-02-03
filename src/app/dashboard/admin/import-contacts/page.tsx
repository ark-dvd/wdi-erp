// ================================================
// WDI ERP - Admin Import Contacts Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Upload, FileText, ArrowRight, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Merge, SkipForward, Search } from 'lucide-react'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

interface EnrichedOrganization {
  name?: string
  type?: string
  businessId?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  contactTypes?: string[]
  disciplines?: string[]
  notes?: string
}

interface EnrichedContact {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  role?: string
  linkedIn?: string
  contactTypes?: string[]
  disciplines?: string[]
  notes?: string
}

interface EnrichedData {
  organization?: EnrichedOrganization
  contacts?: EnrichedContact[]
  confidence?: number
  source?: string
}

interface ParsedItem {
  organization: {
    name: string | null
    phone: string | null
    email: string | null
    website: string | null
    address: string | null
  } | null
  contact: {
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
    role: string | null
    contactTypes: string[]
    disciplines: string[]
  }
  confidence: number
  rawLine: string
  analysis: {
    overallStatus: 'new' | 'merge' | 'duplicate' | 'low_confidence'
    organization: {
      status: string
      existing?: any
      similarity: number
      matchType: string
      fieldsToMerge?: string[]
    }
    contact: {
      status: string
      existing?: any
      similarity: number
      matchType: string
      fieldsToMerge?: string[]
    }
  }
  enriched?: EnrichedData
  mergeSelections?: {
    [field: string]: 'existing' | 'new'
  }
}

interface ParseResults {
  new: ParsedItem[]
  merge: ParsedItem[]
  duplicate: ParsedItem[]
  lowConfidence: ParsedItem[]
  total: number
}

export default function ImportContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  const [rawInput, setRawInput] = useState('')
  const [sourceContext, setSourceContext] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [results, setResults] = useState<ParseResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    new: true,
    merge: true,
    duplicate: false,
    lowConfidence: false
  })

  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  if (status === 'loading') {
    return <div className="p-8 text-center">טוען...</div>
  }

  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const text = await file.text()
      setRawInput(text)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const text = await e.target.files[0].text()
      setRawInput(text)
    }
  }

  const handleProcess = async () => {
    if (!rawInput.trim()) return
    
    setIsProcessing(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/admin/import-contacts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput, sourceContext })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעיבוד')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEnrich = async () => {
    if (!results) return
    
    const orgsToEnrich = [
      ...results.new.filter(item => item.organization?.name),
      ...results.merge.filter(item => item.organization?.name)
    ].map(item => ({
      name: item.organization!.name!,
      phone: item.organization?.phone || undefined,
      originalLine: item.rawLine
    }))

    if (orgsToEnrich.length === 0) {
      setError('אין ארגונים להעשרה')
      return
    }

    setIsEnriching(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/import-contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizations: orgsToEnrich })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהעשרה')
      }

      const enrichedMap = new Map(
        data.enriched.map((e: any) => [e.originalLine, e])
      )

      const updateItems = (items: ParsedItem[]) => 
        items.map(item => {
          const enriched = enrichedMap.get(item.rawLine) as any
          if (enriched && enriched.confidence > 0.3) {
            return { ...item, enriched }
          }
          return item
        })

      setResults({
        ...results,
        new: updateItems(results.new),
        merge: updateItems(results.merge)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעשרה')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleMergeSelection = (
    category: 'new' | 'merge',
    index: number,
    entity: 'organization' | 'contact',
    field: string,
    choice: 'existing' | 'new'
  ) => {
    if (!results) return

    const updatedCategory = [...results[category]]
    const item = { ...updatedCategory[index] }
    
    if (!item.mergeSelections) {
      item.mergeSelections = {}
    }
    item.mergeSelections[`${entity}.${field}`] = choice
    
    updatedCategory[index] = item
    setResults({ ...results, [category]: updatedCategory })
  }

  const handleImport = async () => {
    if (!results) return
    
    const toImport = [
      ...results.new,
      ...results.merge.filter(item => 
        item.analysis.organization.fieldsToMerge?.length || 
        item.analysis.contact.fieldsToMerge?.length
      )
    ]

    if (toImport.length === 0) {
      setError('אין רשומות לייבוא')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/import-contacts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contacts: toImport,
          sourceContext 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשמירה')
      }

      alert(`יובאו בהצלחה!\n${data.organizationsCreated} ארגונים\n${data.contactsCreated} אנשי קשר`)
      setResults(null)
      setRawInput('')
      setSourceContext('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייבוא')
    } finally {
      setImporting(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const renderEnrichedData = (item: ParsedItem) => {
    if (!item.enriched) return null
    const { organization, contacts, confidence, source } = item.enriched

    return (
      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="font-medium text-amber-800 flex items-center gap-2">
            🔍 מידע מועשר מהרשת
          </div>
          {confidence && (
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded">
              {Math.round(confidence * 100)}% ביטחון
            </span>
          )}
        </div>

        {/* Organization Data */}
        {organization && (
          <div className="mb-4 p-3 bg-white rounded border border-amber-100">
            <div className="font-medium text-gray-700 mb-2">🏢 פרטי ארגון</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {organization.name && (
                <div className="col-span-2">
                  <span className="text-gray-500">שם רשמי:</span>{' '}
                  <span className="font-medium text-green-700">{organization.name}</span>
                </div>
              )}
              {organization.type && (
                <div><span className="text-gray-500">סוג:</span> {organization.type}</div>
              )}
              {organization.businessId && (
                <div><span className="text-gray-500">ח.פ.:</span> {organization.businessId}</div>
              )}
              {organization.phone && (
                <div><span className="text-gray-500">📞</span> {organization.phone}</div>
              )}
              {organization.email && (
                <div><span className="text-gray-500">✉️</span> {organization.email}</div>
              )}
              {organization.website && (
                <div className="col-span-2">
                  <span className="text-gray-500">🌐</span>{' '}
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {organization.website}
                  </a>
                </div>
              )}
              {organization.address && (
                <div className="col-span-2"><span className="text-gray-500">📍</span> {organization.address}</div>
              )}
              {organization.contactTypes && organization.contactTypes.length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">סוג קשר:</span>{' '}
                  {organization.contactTypes.map((t, i) => (
                    <span key={i} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mr-1">{t}</span>
                  ))}
                </div>
              )}
              {organization.disciplines && organization.disciplines.length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">דיסציפלינות:</span>{' '}
                  {organization.disciplines.map((d, i) => (
                    <span key={i} className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded mr-1">{d}</span>
                  ))}
                </div>
              )}
              {organization.notes && (
                <div className="col-span-2 text-gray-600 text-xs mt-1 p-2 bg-gray-50 rounded">
                  💡 {organization.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Data */}
        {contacts && contacts.length > 0 && (
          <div className="p-3 bg-white rounded border border-amber-100">
            <div className="font-medium text-gray-700 mb-2">👥 אנשי קשר ({contacts.length})</div>
            <div className="space-y-3">
              {contacts.map((contact, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded border-r-2 border-blue-400">
                  <div className="flex justify-between items-start">
                    <div className="font-medium">
                      {contact.firstName} {contact.lastName}
                      {contact.role && <span className="text-gray-500 font-normal"> - {contact.role}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm mt-1">
                    {contact.phone && (
                      <div><span className="text-gray-400">📞</span> {contact.phone}</div>
                    )}
                    {contact.email && (
                      <div><span className="text-gray-400">✉️</span> {contact.email}</div>
                    )}
                    {contact.linkedIn && (
                      <div className="col-span-2">
                        <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                          🔗 LinkedIn
                        </a>
                      </div>
                    )}
                  </div>
                  {contact.contactTypes && contact.contactTypes.length > 0 && (
                    <div className="mt-1">
                      {contact.contactTypes.map((t, j) => (
                        <span key={j} className="inline-block bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded mr-1">{t}</span>
                      ))}
                    </div>
                  )}
                  {contact.disciplines && contact.disciplines.length > 0 && (
                    <div className="mt-1">
                      {contact.disciplines.map((d, j) => (
                        <span key={j} className="inline-block bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded mr-1">{d}</span>
                      ))}
                    </div>
                  )}
                  {contact.notes && (
                    <div className="text-xs text-gray-500 mt-1">�� {contact.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {source && (
          <div className="mt-2 text-xs text-amber-600">מקור: {source}</div>
        )}
      </div>
    )
  }

  const renderNewItem = (item: ParsedItem, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {item.organization?.name && (
            <div className="font-medium text-gray-900">
              🏢 {item.enriched?.organization?.name || item.organization.name}
              {item.enriched?.organization?.name && item.enriched.organization.name !== item.organization.name && (
                <span className="text-xs text-green-600 mr-2">(שם מתוקן)</span>
              )}
            </div>
          )}
          <div className="text-gray-700">
            👤 {item.contact.firstName} {item.contact.lastName}
            {item.contact.role && <span className="text-gray-500"> - {item.contact.role}</span>}
          </div>
        </div>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">חדש</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {(item.organization?.phone || item.contact.phone) && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            📞 {item.organization?.phone || item.contact.phone}
          </span>
        )}
        {(item.organization?.email || item.contact.email) && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            ✉️ {item.organization?.email || item.contact.email}
          </span>
        )}
        {item.contact.contactTypes?.map((type, i) => (
          <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{type}</span>
        ))}
        {item.contact.disciplines?.map((disc, i) => (
          <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{disc}</span>
        ))}
      </div>

      {renderEnrichedData(item)}

      <div className="mt-2 text-xs text-gray-400 truncate" title={item.rawLine}>
        מקור: {item.rawLine}
      </div>
    </div>
  )

  const renderMergeItem = (item: ParsedItem, index: number) => (
    <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Merge className="h-5 w-5 text-yellow-600" />
          <span className="font-medium text-yellow-800">נמצאה התאמה</span>
        </div>
        <span className="text-xs text-yellow-600">
          דמיון: {Math.round(Math.max(item.analysis.organization.similarity, item.analysis.contact.similarity) * 100)}%
        </span>
      </div>
      
      {renderEnrichedData(item)}

      <div className="mt-2 text-xs text-gray-400 truncate" title={item.rawLine}>
        מקור: {item.rawLine}
      </div>
    </div>
  )

  const renderDuplicateItem = (item: ParsedItem, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 opacity-70">
      <div className="flex justify-between items-start">
        <div>
          {item.organization?.name && <span className="text-gray-600">🏢 {item.organization.name}</span>}
          <span className="text-gray-600 mr-2">👤 {item.contact.firstName} {item.contact.lastName}</span>
        </div>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
          <SkipForward className="h-3 w-3" /> ידלג
        </span>
      </div>
    </div>
  )

  const renderLowConfidenceItem = (item: ParsedItem, index: number) => (
    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-700">
          👤 {item.contact.firstName} {item.contact.lastName}
        </div>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
          {Math.round(item.confidence * 100)}% ביטחון
        </span>
      </div>
      <div className="text-sm text-gray-500 bg-white p-2 rounded border">{item.rawLine}</div>
    </div>
  )

  const totalToImport = results ? results.new.length + results.merge.length : 0

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">ייבוא אנשי קשר</h1>
        <p className="text-gray-500">ייבוא חכם של ארגונים ואנשי קשר עם זיהוי כפילויות</p>
      </div>

      {!results && (
        <>
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">הקשר (אופציונלי)</label>
            <input
              type="text"
              value={sourceContext}
              onChange={(e) => setSourceContext(e.target.value)}
              placeholder='לדוגמה: "רשימת אדריכלים מפרויקט פארק הדרום"'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div
            className={`bg-white rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center mb-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                גררו קובץ או{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  בחרו קובץ
                  <input type="file" className="hidden" accept=".csv,.txt,.xlsx" onChange={handleFileInput} />
                </label>
              </p>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">או הדביקו טקסט</span></div>
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="הדביקו רשימה בכל פורמט..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[200px] font-mono text-sm"
              dir="auto"
            />
          </div>

          {rawInput.trim() && (
            <div className="bg-gray-50 rounded-lg border p-4 flex items-center gap-4 text-sm text-gray-600">
              <FileText className="h-5 w-5" />
              <span>{rawInput.split('\n').filter(l => l.trim()).length} שורות</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleProcess}
              disabled={!rawInput.trim() || isProcessing}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                rawInput.trim() && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> מנתח...</>
              ) : (
                <>נתח והמשך <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </div>
        </>
      )}

      {results && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{results.new.length} חדשים</span>
                </div>
                <div className="flex items-center gap-2">
                  <Merge className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">{results.merge.length} למיזוג</span>
                </div>
                <div className="flex items-center gap-2">
                  <SkipForward className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">{results.duplicate.length} כפילויות</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">{results.lowConfidence.length} לבדיקה</span>
                </div>
              </div>
              <button
                onClick={() => { setResults(null); setRawInput(''); }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                התחל מחדש
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          )}

          {results.new.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleSection('new')}
                className="w-full p-4 bg-green-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">חדשים ({results.new.length})</span>
                </div>
                {expandedSections.new ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.new && (
                <div className="p-4 space-y-3">
                  {results.new.map((item, i) => renderNewItem(item, i))}
                </div>
              )}
            </div>
          )}

          {results.merge.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleSection('merge')}
                className="w-full p-4 bg-yellow-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Merge className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-yellow-700">למיזוג ({results.merge.length})</span>
                </div>
                {expandedSections.merge ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.merge && (
                <div className="p-4 space-y-3">
                  {results.merge.map((item, i) => renderMergeItem(item, i))}
                </div>
              )}
            </div>
          )}

          {results.duplicate.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleSection('duplicate')}
                className="w-full p-4 bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <SkipForward className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-600">כפילויות ({results.duplicate.length})</span>
                </div>
                {expandedSections.duplicate ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.duplicate && (
                <div className="p-4 space-y-2">
                  {results.duplicate.map((item, i) => renderDuplicateItem(item, i))}
                </div>
              )}
            </div>
          )}

          {results.lowConfidence.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleSection('lowConfidence')}
                className="w-full p-4 bg-red-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">ביטחון נמוך ({results.lowConfidence.length})</span>
                </div>
                {expandedSections.lowConfidence ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.lowConfidence && (
                <div className="p-4 space-y-3">
                  {results.lowConfidence.map((item, i) => renderLowConfidenceItem(item, i))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={() => setResults(null)}
              className="px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
            >
              חזרה לעריכה
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleEnrich}
                disabled={isEnriching || (results.new.length === 0 && results.merge.length === 0)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                  !isEnriching && (results.new.length > 0 || results.merge.length > 0)
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isEnriching ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> מעשיר...</>
                ) : (
                  <><Search className="h-5 w-5" /> העשר מהרשת</>
                )}
              </button>

              <button
                onClick={handleImport}
                disabled={importing || totalToImport === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                  !importing && totalToImport > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {importing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> מייבא...</>
                ) : (
                  <>ייבא {totalToImport} רשומות <ArrowRight className="h-5 w-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
