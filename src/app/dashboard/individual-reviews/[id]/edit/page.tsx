// /app/dashboard/individual-reviews/[id]/edit/page.tsx
// Version: 20251221-124000

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';

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

interface IndividualReview {
  id: string;
  contactId: string;
  projectId: string | null;
  externalProjectName: string | null;
  reviewerId: string;
  avgRating: number;
  generalNotes: string | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string; organizationId: string | null; organization: { id: string; name: string } | null };
  project: { id: string; projectNumber: string; name: string } | null;
  reviewer: { id: string; name: string | null; email: string | null };
  [key: string]: any;
}

function StarRatingInput({ value, onChange, label }: { value: number; onChange: (val: number) => void; label: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-gray-400 hover:text-red-500 ml-2 text-sm"
            title="איפוס"
          >
            ✕
          </button>
        )}
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="text-2xl transition-colors focus:outline-none"
            title={value === star ? 'לחץ לאיפוס' : `דירוג ${star}`}
          >
            <Star
              size={24}
              className={star <= (hovered ?? value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'}
            />
          </button>
        ))}
        <span className="text-gray-500 text-sm mr-2 w-6">{value > 0 ? value : '-'}</span>
      </div>
    </div>
  );
}

export default function EditIndividualReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [review, setReview] = useState<IndividualReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState('');

  const reviewId = params?.id as string;

  useEffect(() => {
    fetchReview();
  }, [reviewId]);

  const fetchReview = async () => {
    try {
      const res = await fetch(`/api/individual-reviews/${reviewId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError('אין הרשאה לערוך דירוג זה');
        } else {
          setError('שגיאה בטעינת הדירוג');
        }
        return;
      }
      const data = await res.json();
      
      // Check if user is the reviewer
      if (data.reviewerId !== session?.user?.id) {
        setError('רק המדרג המקורי יכול לערוך את הדירוג');
        return;
      }
      
      // Check 14 day limit
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation > 14) {
        setError('לא ניתן לערוך דירוג לאחר 14 יום');
        return;
      }
      
      setReview(data);
      
      const initialRatings: Record<string, number> = {};
      const initialNotes: Record<string, string> = {};
      CRITERIA_CONFIG.forEach(({ key, noteKey }) => {
        initialRatings[key] = data[key] || 0;
        initialNotes[noteKey] = data[noteKey] || '';
      });
      setRatings(initialRatings);
      setNotes(initialNotes);
      setGeneralNotes(data.generalNotes || '');
    } catch (err) {
      setError('שגיאה בטעינת הדירוג');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ratedCount = Object.values(ratings).filter((v) => v > 0).length;
    if (ratedCount < 6) {
      alert(`יש לדרג לפחות 6 קריטריונים (דורגו ${ratedCount})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/individual-reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ratings, ...notes, generalNotes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      router.push(`/dashboard/individual-reviews/${reviewId}`);
    } catch (err: any) {
      alert(err.message || 'שגיאה בשמירת הדירוג');
    } finally {
      setSaving(false);
    }
  };

  const getRatedCount = () => Object.values(ratings).filter((v) => v > 0).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a3161]"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error || 'הדירוג לא נמצא'}</div>
        <button onClick={() => router.back()} className="text-[#0a3161] hover:underline">← חזרה</button>
      </div>
    );
  }

  const contactName = `${review.contact.firstName} ${review.contact.lastName}`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0a3161]">עריכת דירוג: {contactName}</h1>
          {review.contact.organization && (
            <div className="text-gray-500">{review.contact.organization.name}</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">פרויקט:</span>
            {review.project ? (
              <span className="mr-2 font-medium"><span dir="ltr">#{review.project.projectNumber}</span> {review.project.name}</span>
            ) : (
              <span className="mr-2 font-medium text-orange-600">{review.externalProjectName} (חיצוני)</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">תאריך יצירה:</span>
            <span className="mr-2">{new Date(review.createdAt).toLocaleDateString('he-IL')}</span>
          </div>
        </div>
      </div>

      {/* Criteria */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0a3161]">קריטריונים ({getRatedCount()}/12)</h2>
          {getRatedCount() >= 6 ? (
            <span className="text-green-600 text-sm">✓ מינימום 6 קריטריונים</span>
          ) : (
            <span className="text-amber-600 text-sm">נדרשים עוד {6 - getRatedCount()} קריטריונים</span>
          )}
        </div>

        <div className="space-y-1">
          {CRITERIA_CONFIG.map(({ key, label, noteKey }) => (
            <div key={key}>
              <StarRatingInput
                label={label}
                value={ratings[key] || 0}
                onChange={(val) => setRatings((prev) => ({ ...prev, [key]: val }))}
              />
              {ratings[key] > 0 && (
                <input
                  type="text"
                  value={notes[noteKey] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))}
                  placeholder="הערה לקריטריון (אופציונלי)"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-2 mr-4"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* General Notes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#0a3161] mb-4">הערות כלליות</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none"
          placeholder="הערות נוספות..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving || getRatedCount() < 6}
          className="px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
      </div>
    </div>
  );
}
