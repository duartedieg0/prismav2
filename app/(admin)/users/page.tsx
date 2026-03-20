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
      </div>
    </main>
  );
}
