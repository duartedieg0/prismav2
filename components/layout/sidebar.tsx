'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Cpu,
  Bot,
  BookOpen,
  GraduationCap,
  LifeBuoy,
  Users,
  LogOut,
  UserCircle,
} from 'lucide-react'

interface SidebarProps {
  role: string
  userName: string
  userEmail: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const adminItems = [
  { href: '/config/models', label: 'Modelos de IA', icon: Cpu },
  { href: '/config/agents', label: 'Agentes', icon: Bot },
  { href: '/config/subjects', label: 'Disciplinas', icon: BookOpen },
  { href: '/config/grades', label: 'Séries', icon: GraduationCap },
  { href: '/config/supports', label: 'Suportes', icon: LifeBuoy },
  { href: '/users', label: 'Usuários', icon: Users },
]

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 z-20 flex flex-col py-6
                 bg-surface-container-low/80 backdrop-blur-xl
                 shadow-glass"
    >
      {/* Brand */}
      <div className="px-6 mb-8">
        <p
          className="text-lg font-display font-black text-primary tracking-tight flex items-center gap-2"
          aria-label="Adapte Minha Prova"
        >
          <LayoutDashboard className="size-5" aria-hidden="true" />
          Adapte Minha Prova
        </p>
        {role === 'admin' && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mt-1">
            Painel Admin
          </p>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3" aria-label="Navegação principal">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                         transition-all duration-200
                         ${active
                           ? 'bg-primary-container text-white shadow-sm'
                           : 'text-foreground/70 hover:text-primary hover:bg-primary/10'
                         }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}

        {/* Seção admin */}
        {role === 'admin' && (
          <>
            <div className="mt-4 mb-2 px-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Administração
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                             transition-all duration-200
                             ${active
                               ? 'bg-primary-container text-white shadow-sm'
                               : 'text-foreground/70 hover:text-primary hover:bg-primary/10'
                             }`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3 pt-4">
        <div className="px-4 mb-3">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {userName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                     text-foreground/70 hover:text-primary hover:bg-primary/10 transition-all duration-200"
        >
          <UserCircle className="size-5 shrink-0" aria-hidden="true" />
          Perfil
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-semibold
                     text-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  )
}
