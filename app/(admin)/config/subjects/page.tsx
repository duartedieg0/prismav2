/**
 * Admin Configuration - Subjects Page
 * Server Component for managing school subjects
 *
 * Route: /config/subjects (admin only)
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
import { SubjectsManagementClient } from '@/components/admin/subjects-management';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

async function fetchSubjects(): Promise<Subject[]> {
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

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });

  return (subjects || []) as Subject[];
}

export default async function SubjectsPage() {
  const subjects = await fetchSubjects();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Disciplinas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as disciplinas/matérias disponíveis no sistema
            </p>
          </div>
          <SubjectsManagementClient initialSubjects={subjects} />
        </div>

        {/* Subjects Table */}
        {subjects.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Disciplina
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
                {subjects.map((subject) => (
                  <TableRow
                    key={subject.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                      {subject.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {subject.description || '—'}
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
