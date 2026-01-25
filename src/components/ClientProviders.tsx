// ============================================
// src/components/ClientProviders.tsx
// Version: 20260124
// Client-side providers wrapper for toast and other context providers
// ============================================

'use client'

import { ReactNode } from 'react'
import { ToastProvider } from '@/components/Toast'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}
