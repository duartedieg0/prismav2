/**
 * Admin User Management Page
 * Server Component for managing system users
 *
 * Route: /users (admin only)
 * Features:
 * - List all users with name, email, role, status
 * - Search/filter by name or email
 * - Block/Unblock users
 * - Delete users with confirmation
 * - Role badges (admin/teacher/user)
 * - Status indicators (active/blocked)
 */

import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { Shield, BookOpen, User } from 'lucide-react';
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

/**
 * Get icon for role badge
 */
function getRoleIcon(role: string) {
  switch (role) {
    case 'admin':
      return <Shield className="w-3 h-3" />;
    case 'teacher':
      return <BookOpen className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
}

/**
 * Get badge variant for role
 */
function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'admin':
      return 'default';
    case 'teacher':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Get role display name
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'teacher':
      return 'Professor';
    default:
      return 'Usuário';
  }
}

/**
 * Format date to human-readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

        {/* User Management Client (for search/filter) */}
        <UserManagementClient initialUsers={users} />

        {/* Users Table */}
        {users.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum usuário encontrado
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Cadastro
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {user.full_name || 'Sem nome'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          className="gap-1"
                        >
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.blocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="secondary">Ativo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {/* Actions will be handled by client component */}
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-xs font-medium rounded-md hover:bg-muted transition-colors">
                            {user.blocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button className="px-3 py-1 text-xs font-medium rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
