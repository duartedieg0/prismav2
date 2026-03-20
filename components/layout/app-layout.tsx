import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const userName = profile?.full_name || 'Usuário'
  const userEmail = profile?.email || user.email || ''

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
