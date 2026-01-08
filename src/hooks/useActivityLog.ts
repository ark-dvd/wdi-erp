'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function usePageView(module?: string) {
  const pathname = usePathname()
  const logged = useRef(false)
  
  useEffect(() => {
    if (logged.current) return
    logged.current = true
    
    const logPageView = async () => {
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'PAGE_VIEW',
            category: 'navigation',
            module: module || extractModule(pathname),
            path: pathname
          })
        })
      } catch (e) {
        // silent
      }
    }
    
    logPageView()
  }, [pathname, module])
}

function extractModule(path: string | null): string {
  if (!path) return 'unknown'
  const parts = path.split('/')
  return parts[2] || 'dashboard'
}

export async function logAction(params: {
  action: string
  category: string
  module?: string
  targetType?: string
  targetId?: string
  targetName?: string
  details?: Record<string, any>
}) {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
  } catch (e) {
    // silent
  }
}
