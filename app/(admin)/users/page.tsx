/**
 * Admin User Management Page
 * Server Component for managing system users
 *
 * Route: /users (admin only)
 * Features:
 * - List all users with avatar, name, email, role, status
 * - Search by name or email
 * - Filter by role (admin/teacher/user)
 * - Filter by status (active/blocked)
 * - Edit and delete actions
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserManagementClient } from '@/components/admin/user-management';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'teacher' | 'user';
  blocked: boolean;
  created_at: string;
}

/**
 * Fetch all user profiles from database
 */
async function fetchAllUsers(): Promise<UserProfile[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, blocked, created_at')
    .order('created_at', { ascending: false });

  if (error || !users) {
    return [];
  }

  return users as UserProfile[];
}

function getRoleBadgeColor(role: UserProfile['role']) {
  switch (role) {
    case 'admin':
      return 'bg-primary/10 text-primary';
    case 'teacher':
      return 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200';
    case 'user':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default async function UsersPage() {
  const users = await fetchAllUsers();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize e gerencie todos os usuários do sistema
          </p>
        </div>

        {/* User Management Client Component */}
        <UserManagementClient initialUsers={users} />

        {/* Users Table */}
        {users.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10 mt-8">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Usuário
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Email
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Função
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                            {(user.full_name || 'U')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-foreground">
                            {user.full_name || 'Sem nome'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          getRoleBadgeColor(user.role)
                        )}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          user.blocked
                            ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-200'
                            : 'bg-success/10 text-success'
                        )}
                      >
                        {user.blocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  );
}
