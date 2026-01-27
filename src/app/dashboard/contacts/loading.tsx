// Loading state for contacts pages - provides Suspense boundary for useSearchParams
import { Loader2 } from 'lucide-react'

export default function ContactsLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" />
    </div>
  )
}
