// ============================================
// src/hooks/useUnsavedChangesWarning.ts
// Version: 20260124
// UI-015: Dirty state warning hook
// Prevents data loss by warning users before navigating away from unsaved changes
// ============================================

'use client'

import { useEffect, useCallback } from 'react'

/**
 * Hook to warn users before navigating away from unsaved form changes.
 * Addresses UI-015 (Critical): No dirty state warning when navigating away from unsaved form changes.
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Optional custom warning message (uses Hebrew default)
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  message: string = 'יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?'
) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        // Modern browsers require returnValue to be set
        e.returnValue = message
        return message
      }
    },
    [isDirty, message]
  )

  useEffect(() => {
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty, handleBeforeUnload])
}

export default useUnsavedChangesWarning
