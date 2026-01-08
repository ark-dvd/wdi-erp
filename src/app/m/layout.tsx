import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import MobileLayoutClient from './MobileLayoutClient'

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect('/api/auth/signin')
  }

  const userName = session.user?.name || 'משתמש'

  return <MobileLayoutClient userName={userName}>{children}</MobileLayoutClient>
}