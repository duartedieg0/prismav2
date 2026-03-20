'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Layers,
  Users,
  LogOut,
} from 'lucide-react'

interface SidebarProps {
  role: string
  userName: string
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
  ]

  const adminItems = [
    {
      href: '/admin/ai-models',
      label: 'Modelos de IA',
      icon: Brain,
    },
    {
      href: '/admin/agents',
      label: 'Agentes',
      icon: Layers,
    },
    {
      href: '/admin/subjects',
      label: 'Disciplinas',
      icon: BookOpen,
    },
    {
      href: '/admin/grades',
      label: 'Séries',
      icon: BookOpen,
    },
    {
      href: '/admin/supports',
      label: 'Suportes',
      icon: Brain,
    },
    {
      href: '/admin/users',
      label: 'Usuários',
      icon: Users,
    },
  ]

  return (
    <aside className="hidden md:flex md:w-60 md:fixed md:inset-y-0 md:left-0 flex-col bg-slate-950 text-white">
      {/* Main nav */}
      <nav
        className="flex-1 flex flex-col gap-1 p-4"
        aria-label="Navegação principal"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                active
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Admin section */}
      {role === 'admin' && (
        <nav className="flex-col gap-1 p-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-3 px-3">
            Administração
          </div>
          {adminItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-sm mb-3">
          <div className="font-medium text-white">{userName}</div>
          <div className="text-xs text-slate-400">{userEmail}</div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
