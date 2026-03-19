/**
 * User Management Client Component
 * Placeholder for CRUD operations on users
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserManagementClientProps {
  initialUsers: User[];
}

export function UserManagementClient({
  initialUsers: _initialUsers,
}: UserManagementClientProps) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Usuário
    </Button>
  );
}
