/**
 * Admin Configuration - Grade Levels Page
 * Server Component for managing school grade levels
 *
 * Route: /config/grades (admin only)
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
import { GradesManagementClient } from '@/components/admin/grades-management';

interface GradeLevel {
  id: string;
  level: number;
  name: string;
  created_at: string;
}

async function fetchGradeLevels(): Promise<GradeLevel[]> {
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

  const { data: grades } = await supabase
    .from('grade_levels')
    .select('id, level, name, created_at')
    .order('level', { ascending: true });

  return (grades || []) as GradeLevel[];
}

export default async function GradesPage() {
  const grades = await fetchGradeLevels();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Séries/Anos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os níveis de série disponíveis no sistema
            </p>
          </div>
          <GradesManagementClient initialGrades={grades} />
        </div>

        {/* Grades Table */}
        {grades.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Nível
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow
                    key={grade.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                      {grade.level}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {grade.name}
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
