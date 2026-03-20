/**
 * User Management Client Component
 * Handles search, filtering, and table display for user management
 *
 * Features:
 * - Avatar column with initials
 * - Name/email column with secondary text
 * - Role badge with color coding
 * - Status badge (active/blocked)
 * - Search by name or email
 * - Filter by role (admin/teacher/user)
 * - Filter by status (active/blocked)
 * - Edit and delete actions with tooltips
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Search, Pencil, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'teacher' | 'user';
  blocked: boolean;
  created_at: string;
}

interface UserManagementClientProps {
  initialUsers: User[];
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtered users with useMemo for performance
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      // Search filter (name or email, case-insensitive)
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (user.full_name?.toLowerCase().includes(searchLower) ?? false) ||
        user.email.toLowerCase().includes(searchLower);

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !user.blocked) ||
        (statusFilter === 'blocked' && user.blocked);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [initialUsers, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="flex flex-wrap gap-3">
        {/* Search Field */}
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              {initialUsers.length === 0
                ? 'Nenhum usuário encontrado'
                : 'Nenhum resultado para os filtros aplicados'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                    Usuário
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                    Função
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    {/* Avatar + Name/Email */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium"
                          aria-hidden="true"
                        >
                          {user.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user.full_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          user.role === 'admin' && 'bg-primary/10 text-primary',
                          user.role === 'teacher' &&
                            'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200',
                          user.role === 'user' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          user.blocked
                            ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-200'
                            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-200'
                        )}
                      >
                        {user.blocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2">
                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="w-4 h-4" />
                                <span className="sr-only">Editar usuário</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sr-only">Deletar usuário</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Deletar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
