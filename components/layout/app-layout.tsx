import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()

  // Fetch current user from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  // Fetch user profile to get role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const userName = profile?.full_name || 'Usuário'
  const userEmail = profile?.email || user.email || ''

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 md:pl-60">
        {children}
      </main>
    </div>
  )
}
