// /app/dashboard/vendors/page.tsx
// Version: 20251221-080500
// 4-step wizard: Project -> Organization -> Contact (single) -> Rate

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  averageRating?: number;
  reviewCount?: number;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  averageRating?: number;
  reviewCount?: number;
  organizationId?: string;
}

const CRITERIA = [
  { key: 'accountability', label: 'אחריותיות', num: 1 },
  { key: 'boqQuality', label: 'איכות כתבי כמויות', num: 2 },
  { key: 'specQuality', label: 'איכות מפרטים', num: 3 },
  { key: 'planQuality', label: 'איכות תוכניות', num: 4 },
  { key: 'valueEngineering', label: 'הנדסת ערך', num: 5 },
  { key: 'availability', label: 'זמינות', num: 6 },
  { key: 'interpersonal', label: 'יחסי אנוש', num: 7 },
  { key: 'creativity', label: 'יצירתיות', num: 8 },
  { key: 'expertise', label: 'מומחיות טכנית', num: 9 },
  { key: 'timelinessAdherence', label: 'עמידה בזמנים', num: 10 },
  { key: 'proactivity', label: 'פרואקטיביות', num: 11 },
  { key: 'communication', label: 'תקשורת', num: 12 },
] as const;

type CriteriaKey = typeof CRITERIA[number]['key'];

interface IndividualRating {
  [key: string]: number | string | null;
}

export default function VendorsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [rating, setRating] = useState<IndividualRating>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Search filters
  const [projectSearch, setProjectSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchAllOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchContacts(selectedOrg.id);
    }
  }, [selectedOrg]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects?state=פעיל');
      const data = await res.json();
      // MAYBACH: Handle paginated response format { items: [...], pagination: {...} }
      setProjects(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError('שגיאה בטעינת פרויקטים');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      // MAYBACH: Handle paginated response format { items: [...], pagination: {...} }
      setOrganizations(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('שגיאה בטעינת ארגונים:', err);
    }
  };

  const fetchContacts = async (orgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?organizationId=${orgId}`);
      const data = await res.json();
      // MAYBACH: Handle paginated response format { items: [...], pagination: {...} }
      setContacts(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError('שגיאה בטעינת אנשי קשר');
    } finally {
      setLoading(false);
    }
  };

  const initializeRating = () => {
    const emptyRating: IndividualRating = { generalNotes: '' };
    CRITERIA.forEach(c => {
      emptyRating[c.key] = 0;
      emptyRating[`${c.key}Note`] = '';
    });
    setRating(emptyRating);
  };

  const handleRatingChange = (field: string, value: number | string) => {
    setRating(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStarClick = (criteriaKey: string, starValue: number) => {
    const currentValue = (rating[criteriaKey] as number) || 0;
    // אם לוחצים על אותו כוכב - מאפס, אחרת מעדכן
    if (currentValue === starValue) {
      handleRatingChange(criteriaKey, 0);
    } else {
      handleRatingChange(criteriaKey, starValue);
    }
  };

  const validateRatings = (): boolean => {
    let ratedCount = 0;
    for (const c of CRITERIA) {
      const val = rating[c.key];
      if (typeof val === 'number' && val > 0) ratedCount++;
    }
    if (ratedCount < 6) {
      setError(`יש לדרג לפחות 6 קריטריונים מתוך 12 (דורגו ${ratedCount})`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRatings()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload: any = {
        contactId: selectedContact!.id,
        projectId: selectedProject!.id,
        generalNotes: rating.generalNotes || null,
      };
      
      for (const c of CRITERIA) {
        payload[c.key] = typeof rating[c.key] === 'number' ? rating[c.key] : 0;
        payload[`${c.key}Note`] = rating[`${c.key}Note`] || null;
      }
      
      const res = await fetch('/api/individual-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'שגיאה בשמירת הדירוג');
      }
      
      setSuccessMessage(`הדירוג של ${selectedContact?.firstName} ${selectedContact?.lastName} נשמר בהצלחה!`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateAnother = () => {
    setSuccessMessage(null);
    setSelectedContact(null);
    setRating({});
    setStep(3);
  };

  const handleFinish = () => {
    router.push('/dashboard/contacts?tab=organizations');
  };

  const renderStars = (criteriaKey: string, currentValue: number) => {
    return (
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(criteriaKey, star)}
            className={`text-2xl transition-colors ${
              star <= currentValue ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
            title={currentValue === star ? 'לחץ לאיפוס' : `דירוג ${star}`}
          >
            ★
          </button>
        ))}
        {currentValue > 0 && (
          <button
            type="button"
            onClick={() => handleRatingChange(criteriaKey, 0)}
            className="text-sm text-gray-400 hover:text-red-500 mr-2"
            title="אפס דירוג"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  // Filtered lists
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.projectNumber.includes(projectSearch)
  );

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">שלב 1: בחירת פרויקט</h2>
      
      <input
        type="text"
        placeholder="🔍 חיפוש פרויקט..."
        value={projectSearch}
        onChange={e => setProjectSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      
      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredProjects.map(project => (
          <button
            key={project.id}
            onClick={() => {
              setSelectedProject(project);
              setStep(2);
            }}
            className={`p-4 border rounded-lg text-right hover:bg-blue-50 transition-colors ${
              selectedProject?.id === project.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="font-medium">{project.projectNumber} - {project.name}</div>
          </button>
        ))}
        {filteredProjects.length === 0 && (
          <div className="p-4 text-gray-500 text-center">לא נמצאו פרויקטים</div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">שלב 2: בחירת ארגון</h2>
      <p className="text-gray-600">פרויקט: {selectedProject?.projectNumber} - {selectedProject?.name}</p>
      
      <input
        type="text"
        placeholder="🔍 חיפוש ארגון..."
        value={orgSearch}
        onChange={e => setOrgSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      
      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredOrgs.map(org => (
          <button
            key={org.id}
            onClick={() => {
              setSelectedOrg(org);
              setSelectedContact(null);
              setContactSearch('');
              setStep(3);
            }}
            className={`p-4 border rounded-lg text-right hover:bg-blue-50 transition-colors ${
              selectedOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="font-medium">{org.name}</div>
            {org.averageRating && (
              <div className="text-sm text-gray-500">
                דירוג ממוצע: {org.averageRating.toFixed(1)} ({org.reviewCount} דירוגים)
              </div>
            )}
          </button>
        ))}
        {filteredOrgs.length === 0 && (
          <div className="p-4 text-gray-500 text-center">לא נמצאו ארגונים</div>
        )}
      </div>
      
      <button
        onClick={() => setStep(1)}
        className="px-4 py-2 text-gray-600 hover:text-gray-800"
      >
        → חזרה לבחירת פרויקט
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">שלב 3: בחירת איש קשר לדירוג</h2>
      <p className="text-gray-600">ארגון: {selectedOrg?.name}</p>
      
      <input
        type="text"
        placeholder="🔍 חיפוש איש קשר..."
        value={contactSearch}
        onChange={e => setContactSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      
      {contacts.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          אין אנשי קשר בארגון זה
        </div>
      ) : (
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                initializeRating();
                setStep(4);
              }}
              className="p-4 border rounded-lg text-right hover:bg-blue-50 transition-colors border-gray-200"
            >
              <div className="font-medium">{contact.firstName} {contact.lastName}</div>
              {contact.role && <div className="text-sm text-gray-500">{contact.role}</div>}
              {contact.averageRating && (
                <div className="text-sm text-gray-500">
                  דירוג ממוצע: {contact.averageRating.toFixed(1)} ({contact.reviewCount} דירוגים)
                </div>
              )}
            </button>
          ))}
          {filteredContacts.length === 0 && (
            <div className="p-4 text-gray-500 text-center">לא נמצאו אנשי קשר</div>
          )}
        </div>
      )}
      
      <button
        onClick={() => setStep(2)}
        className="px-4 py-2 text-gray-600 hover:text-gray-800"
      >
        → חזרה לבחירת ארגון
      </button>
    </div>
  );

  const renderStep4 = () => {
    // הצגת הודעת הצלחה עם כפתורים
    if (successMessage) {
      return (
        <div className="space-y-6">
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <div className="text-lg font-medium text-green-800">{successMessage}</div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRateAnother}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              דרג איש קשר נוסף מ{selectedOrg?.name}
            </button>
            <button
              onClick={handleFinish}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              סיים
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">שלב 4: דירוג {selectedContact?.firstName} {selectedContact?.lastName}</h2>
        <p className="text-gray-600">
          פרויקט: {selectedProject?.projectNumber} | ארגון: {selectedOrg?.name}
        </p>
        <p className="text-sm text-orange-600">* יש לדרג לפחות 6 קריטריונים מתוך 12 (לחיצה על אותו כוכב מאפסת)</p>
        
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid gap-4">
            {CRITERIA.map(criteria => (
              <div key={criteria.key} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                  {criteria.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{criteria.label}</span>
                    {renderStars(criteria.key, (rating[criteria.key] as number) || 0)}
                  </div>
                  <input
                    type="text"
                    placeholder="הערה (אופציונלי)"
                    value={(rating[`${criteria.key}Note`] as string) || ''}
                    onChange={e => handleRatingChange(`${criteria.key}Note`, e.target.value)}
                    className="w-full px-3 py-1 text-sm border rounded"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <label className="block font-medium mb-2">הערות כלליות</label>
            <textarea
              value={(rating.generalNotes as string) || ''}
              onChange={e => handleRatingChange('generalNotes', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="הערות נוספות..."
            />
          </div>
        </div>
        
        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <button
            onClick={() => setStep(3)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            → חזרה לבחירת איש קשר
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'שומר...' : 'שמור דירוג'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">דירוג ספקים ויועצים</h1>
      
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="mr-2 font-bold">×</button>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">טוען...</div>
      ) : (
        <>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </>
      )}
    </div>
  );
}
