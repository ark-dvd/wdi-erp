// /app/dashboard/vendors/page.tsx
// Version: 20260129-HIERARCHY-FIX
// 4-step wizard: Project -> Organization -> Contact (single) -> Rate
// Fix: Collapse/expand hierarchy matching Projects page

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, FolderKanban, Building2, Layers } from 'lucide-react';

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  children?: Project[];
}

// Helper to get icon based on project type
function getProjectIcon(project: Project) {
  // Mega project (has zone children)
  if (project.children?.some(c => /^\d{4}-[A-Z]$/.test(c.projectNumber))) {
    return <Layers size={16} className="text-[#0a3161]" />;
  }
  // Building (has number suffix)
  if (/^\d{4}-\d{2}$/.test(project.projectNumber) || /^\d{4}-[A-Z]-\d{2}$/.test(project.projectNumber)) {
    return <Building2 size={16} className="text-[#0a3161]" />;
  }
  // Default project
  return <FolderKanban size={16} className="text-[#0a3161]" />;
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
  const [isExternalProject, setIsExternalProject] = useState(false);
  const [externalProjectName, setExternalProjectName] = useState('');
  const [externalProjectOptions, setExternalProjectOptions] = useState<string[]>([]);
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

  // Collapse/expand state for project hierarchy
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProjects();
    fetchAllOrganizations();
    fetchExternalProjects();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchContacts(selectedOrg.id);
    }
  }, [selectedOrg]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // level=main gets proper hierarchy (top-level projects with nested children)
      const res = await fetch('/api/projects?state=פעיל&level=main');
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
      // RBAC v2: Use dropdown=true to get all organizations without pagination
      const res = await fetch('/api/organizations?dropdown=true');
      const data = await res.json();
      // dropdown=true returns array directly, not paginated
      setOrganizations(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error('שגיאה בטעינת ארגונים:', err);
    }
  };

  const fetchExternalProjects = async () => {
    try {
      const res = await fetch('/api/individual-reviews/external-projects');
      if (res.ok) {
        const data = await res.json();
        setExternalProjectOptions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('שגיאה בטעינת פרויקטים חיצוניים:', err);
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

    // Validate project selection
    if (!isExternalProject && !selectedProject) {
      setError('יש לבחור פרויקט');
      return;
    }
    if (isExternalProject && !externalProjectName.trim()) {
      setError('יש להזין שם פרויקט חיצוני');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        contactId: selectedContact!.id,
        generalNotes: rating.generalNotes || null,
      };

      // Either projectId or externalProjectName
      if (isExternalProject) {
        payload.externalProjectName = externalProjectName.trim();
      } else {
        payload.projectId = selectedProject!.id;
      }
      
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

  // Toggle project expansion
  const toggleProjectExpand = (id: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProjects(newExpanded);
  };

  // Filter top-level projects (search applies to all levels)
  const matchesSearch = (p: Project): boolean => {
    return p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
           p.projectNumber.includes(projectSearch);
  };

  // Check if project or any of its descendants match
  const projectOrDescendantsMatch = (p: Project): boolean => {
    if (matchesSearch(p)) return true;
    if (p.children) {
      return p.children.some(c => projectOrDescendantsMatch(c));
    }
    return false;
  };

  // Filtered top-level projects
  const filteredProjects = projects.filter(p => projectOrDescendantsMatch(p));

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Render a single project row with expand/collapse
  const renderProjectRow = (project: Project, depth: number = 0) => {
    const hasChildren = project.children && project.children.length > 0;
    const isExpanded = expandedProjects.has(project.id);
    const childrenMatchSearch = hasChildren && project.children!.some(c => projectOrDescendantsMatch(c));

    // If searching and this item doesn't match but has matching children, show it expanded
    const shouldShowExpanded = projectSearch && childrenMatchSearch;
    const effectivelyExpanded = isExpanded || shouldShowExpanded;

    return (
      <div key={project.id}>
        <div
          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors cursor-pointer ${
            selectedProject?.id === project.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          } ${depth > 0 ? 'bg-gray-50/50' : ''}`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          {/* Expand/Collapse button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleProjectExpand(project.id);
            }}
            className="w-5 h-5 flex items-center justify-center"
          >
            {hasChildren ? (
              effectivelyExpanded ? (
                <ChevronDown size={16} className="text-gray-400 hover:text-[#0a3161]" />
              ) : (
                <ChevronLeft size={16} className="text-gray-400 hover:text-[#0a3161]" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>

          {/* Icon */}
          <div>{getProjectIcon(project)}</div>

          {/* Project info - clickable to select */}
          <div
            className="flex-1 text-right"
            onClick={() => {
              setSelectedProject(project);
              setIsExternalProject(false);
              setExternalProjectName('');
              setStep(2);
            }}
          >
            <div className="font-medium">{project.projectNumber} - {project.name}</div>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && effectivelyExpanded && (
          <div className="mt-1 space-y-1">
            {project.children!
              .filter(c => !projectSearch || projectOrDescendantsMatch(c))
              .map(child => renderProjectRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">שלב 1: בחירת פרויקט</h2>

      {/* External Project Option */}
      <div className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isExternalProject}
            onChange={(e) => {
              setIsExternalProject(e.target.checked);
              if (e.target.checked) {
                setSelectedProject(null);
              } else {
                setExternalProjectName('');
              }
            }}
            className="w-5 h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
          />
          <span className="font-medium text-orange-800">פרויקט חיצוני (לא במערכת)</span>
        </label>
        {isExternalProject && (
          <div className="mt-3 space-y-3">
            {/* Combobox with autocomplete */}
            <div>
              <label className="block text-sm text-orange-700 mb-1">בחר פרויקט קיים או הזן שם חדש:</label>
              <input
                type="text"
                list="external-projects-list"
                placeholder="הקלד או בחר פרויקט חיצוני..."
                value={externalProjectName}
                onChange={e => setExternalProjectName(e.target.value)}
                className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <datalist id="external-projects-list">
                {externalProjectOptions.map((name, idx) => (
                  <option key={idx} value={name} />
                ))}
              </datalist>
            </div>

            {/* Quick select buttons for existing projects */}
            {externalProjectOptions.length > 0 && (
              <div>
                <div className="text-xs text-orange-600 mb-2">פרויקטים חיצוניים קיימים:</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {externalProjectOptions.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setExternalProjectName(name)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        externalProjectName === name
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {externalProjectName.trim() && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                המשך לבחירת ארגון ←
              </button>
            )}
          </div>
        )}
      </div>

      {!isExternalProject && (
        <>
          <input
            type="text"
            placeholder="🔍 חיפוש פרויקט..."
            value={projectSearch}
            onChange={e => setProjectSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredProjects.map(project => renderProjectRow(project, 0))}
            {filteredProjects.length === 0 && (
              <div className="p-4 text-gray-500 text-center">לא נמצאו פרויקטים</div>
            )}
          </div>
        </>
      )}
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
          פרויקט: {isExternalProject ? (
            <span className="text-orange-600 font-medium">{externalProjectName} (חיצוני)</span>
          ) : (
            selectedProject?.projectNumber
          )} | ארגון: {selectedOrg?.name}
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
    <div className="p-6 max-w-6xl mx-auto">
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
