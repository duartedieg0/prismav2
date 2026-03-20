/**
 * Admin Configuration - Supports Page
 * Server Component for managing educational supports/accommodations
 *
 * Route: /config/supports (admin only)
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
import { SupportsManagementClient } from '@/components/admin/supports-management';

interface Support {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchSupports(): Promise<Support[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: supports } = await supabase
    .from('exam_supports')
    .select('id, name, description, created_at, updated_at')
    .order('name', { ascending: true });

  return (supports || []) as Support[];
}

export default async function SupportsPage() {
  const supports = await fetchSupports();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suportes Educacionais</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os tipos de suporte/acomodação disponíveis
            </p>
          </div>
          <SupportsManagementClient initialSupports={supports} />
        </div>

        {/* Supports Table */}
        {supports.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supports.map((support) => (
                  <TableRow
                    key={support.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                      {support.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {support.description || '—'}
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
