// /app/dashboard/contacts/[id]/reviews/page.tsx
// v20251219-230800

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Star, Loader2 } from 'lucide-react';

const IND_CRITERIA_LABELS: Record<string, string> = {
  planQuality: 'איכות תכנון',
  specQuality: 'איכות מפרטים',
  boqQuality: 'איכות כתבי כמויות',
  expertise: 'מומחיות מקצועית',
  communication: 'תקשורת',
  availability: 'זמינות',
  proactivity: 'פרואקטיביות',
  accountability: 'אחריותיות',
  creativity: 'יצירתיות',
  valueEngineering: 'הנדסת ערך',
  commitmentAdherence: 'עמידה בהתחייבויות',
  timelinessAdherence: 'עמידה בזמנים',
  interpersonal: 'יחסים בינאישיים',
};

interface IndividualReview {
  id: string;
  avgRating: number | null;
  createdAt: string;
  vendorReview: {
    id: string;
    project: { id: string; projectNumber: string; name: string };
    reviewer: { employee: { firstName: string; lastName: string } | null };
  };
  [key: string]: any;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  averageRating: number | null;
  reviewCount: number;
  organization: { id: string; name: string } | null;
}

export default function ContactReviewsPage() {
  const params = useParams();
  const contactId = params?.id as string;
  const [contact, setContact] = useState<Contact | null>(null);
  const [reviews, setReviews] = useState<IndividualReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const fetchData = async () => {
    try {
      // Fetch contact details
      const contactRes = await fetch(`/api/contacts/${contactId}`);
      if (!contactRes.ok) throw new Error('Contact not found');
      const contactData = await contactRes.json();
      setContact(contactData);

      // Fetch individual reviews for this contact
      const reviewsRes = await fetch(`/api/contacts/${contactId}/reviews`);
      if (reviewsRes.ok) {
        setReviews(await reviewsRes.json());
      }
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const toggleReview = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedReviews(new Set());
    } else {
      setExpandedReviews(new Set(reviews.map(r => r.id)));
    }
    setAllExpanded(!allExpanded);
  };

  const renderStars = (rating: number | null, size: number = 16) => {
    if (rating === null) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
        <span className="text-gray-600 mr-2 text-sm">({rating})</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getReviewerName = (reviewer: { employee: { firstName: string; lastName: string } | null }) => {
    if (!reviewer?.employee) return 'לא ידוע';
    return `${reviewer.employee.firstName} ${reviewer.employee.lastName}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !contact) {
    return <div className="p-6"><div className="bg-red-50 text-red-600 p-4 rounded-lg">{error || 'איש הקשר לא נמצא'}</div></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/contacts" className="hover:text-blue-600">אנשי קשר</Link>
          <span>›</span>
          <Link href={`/dashboard/contacts/${contactId}`} className="hover:text-blue-600">
            {contact.firstName} {contact.lastName}
          </Link>
          <span>›</span>
          <span>דירוגים</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">דירוגי {contact.firstName} {contact.lastName}</h1>
            {contact.organization && (
              <Link href={`/dashboard/contacts/org/${contact.organization.id}`} className="text-sm text-gray-500 hover:text-blue-600">
                {contact.organization.name}
              </Link>
            )}
          </div>
          {contact.reviewCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg">
              <Star size={24} className="fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold">{contact.averageRating?.toFixed(1)}</span>
              <span className="text-gray-500">({contact.reviewCount} דירוגים)</span>
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse All */}
      {reviews.length > 1 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleAll}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            {allExpanded ? (
              <><ChevronUp size={16} /> כווץ הכל</>
            ) : (
              <><ChevronDown size={16} /> הרחב הכל</>
            )}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          אין דירוגים עדיין
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleReview(review.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                    <span className="text-xl font-bold">{review.avgRating?.toFixed(1) || '-'}</span>
                  </div>
                  <div className="text-right">
                    <Link 
                      href={`/dashboard/projects/${review.vendorReview.project.id}`}
                      className="text-blue-600 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{review.vendorReview.project.projectNumber} {review.vendorReview.project.name}
                    </Link>
                    <div className="text-sm text-gray-500">
                      דורג ע"י {getReviewerName(review.vendorReview.reviewer)} • {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                {expandedReviews.has(review.id) ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </button>

              {expandedReviews.has(review.id) && (
                <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(IND_CRITERIA_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700">{label}</span>
                        {renderStars(review[key])}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href={`/dashboard/contacts/${contactId}`} className="text-blue-600 hover:underline">← חזרה לאיש הקשר</Link>
      </div>
    </div>
  );
}
