// /app/dashboard/individual-reviews/[id]/page.tsx
// Version: 20251221-124500

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight, Star, Edit, Trash2 } from 'lucide-react';

interface IndividualReview {
  id: string;
  contactId: string;
  projectId: string;
  reviewerId: string;
  avgRating: number;
  generalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  accountability: number;
  accountabilityNote: string | null;
  boqQuality: number;
  boqQualityNote: string | null;
  specQuality: number;
  specQualityNote: string | null;
  planQuality: number;
  planQualityNote: string | null;
  valueEngineering: number;
  valueEngineeringNote: string | null;
  availability: number;
  availabilityNote: string | null;
  interpersonal: number;
  interpersonalNote: string | null;
  creativity: number;
  creativityNote: string | null;
  expertise: number;
  expertiseNote: string | null;
  timelinessAdherence: number;
  timelinessAdherenceNote: string | null;
  proactivity: number;
  proactivityNote: string | null;
  communication: number;
  communicationNote: string | null;
  reviewer: {
    id: string;
    name: string | null;
    email: string | null;
  };
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    organizationId: string | null;
    organization: {
      id: string;
      name: string;
    } | null;
  };
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
}

const CRITERIA_CONFIG = [
  { key: 'accountability', label: 'אחריותיות', noteKey: 'accountabilityNote' },
  { key: 'boqQuality', label: 'איכות כתבי כמויות', noteKey: 'boqQualityNote' },
  { key: 'specQuality', label: 'איכות מפרטים', noteKey: 'specQualityNote' },
  { key: 'planQuality', label: 'איכות תוכניות', noteKey: 'planQualityNote' },
  { key: 'valueEngineering', label: 'הנדסת ערך', noteKey: 'valueEngineeringNote' },
  { key: 'availability', label: 'זמינות', noteKey: 'availabilityNote' },
  { key: 'interpersonal', label: 'יחסי אנוש', noteKey: 'interpersonalNote' },
  { key: 'creativity', label: 'יצירתיות', noteKey: 'creativityNote' },
  { key: 'expertise', label: 'מומחיות טכנית', noteKey: 'expertiseNote' },
  { key: 'timelinessAdherence', label: 'עמידה בזמנים', noteKey: 'timelinessAdherenceNote' },
  { key: 'proactivity', label: 'פרואקטיביות', noteKey: 'proactivityNote' },
  { key: 'communication', label: 'תקשורת', noteKey: 'communicationNote' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

export default function IndividualReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [review, setReview] = useState<IndividualReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await fetch(`/api/individual-reviews/${params?.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('דירוג לא נמצא');
          } else {
            setError('שגיאה בטעינת הדירוג');
          }
          return;
        }
        const data = await res.json();
        setReview(data);
      } catch (err) {
        setError('שגיאה בטעינת הדירוג');
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchReview();
    }
  }, [params?.id]);

  const canEditOrDelete = () => {
    if (!review || !session?.user?.id) return false;
    if (review.reviewerId !== session.user.id) return false;
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation <= 14;
  };

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הדירוג?')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/individual-reviews/${params?.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'שגיאה במחיקה');
        return;
      }
      
      router.push(`/dashboard/contacts/${review?.contactId}`);
    } catch (err) {
      alert('שגיאה במחיקה');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a3161]"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'דירוג לא נמצא'}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[#0a3161] hover:underline"
        >
          ← חזרה
        </button>
      </div>
    );
  }

  const ratedCriteria = CRITERIA_CONFIG.filter(
    (c) => (review[c.key as keyof IndividualReview] as number) > 0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#0a3161]">
              דירוג: {review.contact.firstName} {review.contact.lastName}
            </h1>
            {review.contact.organization && (
              <Link
                href={`/dashboard/contacts/org/${review.contact.organization.id}`}
                className="text-gray-600 hover:text-[#0a3161]"
              >
                {review.contact.organization.name}
              </Link>
            )}
          </div>
        </div>

        {canEditOrDelete() && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/individual-reviews/${review.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90"
            >
              <Edit size={18} />
              עריכה
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={18} />
              {deleting ? 'מוחק...' : 'מחק'}
            </button>
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-[#0a3161] mb-1">
              {review.avgRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(review.avgRating)} />
            <div className="text-sm text-gray-500 mt-1">
              {ratedCriteria.length} קריטריונים דורגו
            </div>
          </div>
          
          <div className="text-left">
            <div className="text-sm text-gray-500">פרויקט</div>
            <Link
              href={`/dashboard/projects/${review.project.id}`}
              className="text-[#0a3161] hover:underline font-medium"
            >
              #{review.project.projectNumber} {review.project.name}
            </Link>
            
            <div className="text-sm text-gray-500 mt-3">דורג ע"י</div>
            <div className="font-medium">{review.reviewer.name || review.reviewer.email}</div>
            
            <div className="text-sm text-gray-500 mt-3">תאריך</div>
            <div>{new Date(review.createdAt).toLocaleDateString('he-IL')}</div>
          </div>
        </div>
      </div>

      {/* Criteria Grid */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#0a3161] mb-4">קריטריונים</h2>
        
        <div className="grid gap-4">
          {CRITERIA_CONFIG.map((criteria) => {
            const rating = review[criteria.key as keyof IndividualReview] as number;
            const note = review[criteria.noteKey as keyof IndividualReview] as string | null;
            
            if (rating === 0) return null;
            
            return (
              <div
                key={criteria.key}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{criteria.label}</span>
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} />
                    <span className="text-lg font-semibold text-gray-700">{rating}</span>
                  </div>
                </div>
                {note && (
                  <div className="text-sm text-gray-600 bg-white rounded p-2 mt-2">
                    {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unrated criteria */}
        {CRITERIA_CONFIG.filter((c) => (review[c.key as keyof IndividualReview] as number) === 0).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500 mb-2">לא דורג:</div>
            <div className="flex flex-wrap gap-2">
              {CRITERIA_CONFIG.filter((c) => (review[c.key as keyof IndividualReview] as number) === 0).map((criteria) => (
                <span
                  key={criteria.key}
                  className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm"
                >
                  {criteria.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* General Notes */}
      {review.generalNotes && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-[#0a3161] mb-3">הערות כלליות</h2>
          <div className="text-gray-700 whitespace-pre-wrap">
            {review.generalNotes}
          </div>
        </div>
      )}

      {/* Edit restriction notice */}
      {review.reviewerId === session?.user?.id && !canEditOrDelete() && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          לא ניתן לערוך או למחוק דירוג לאחר 14 יום מיום יצירתו.
        </div>
      )}
    </div>
  );
}
