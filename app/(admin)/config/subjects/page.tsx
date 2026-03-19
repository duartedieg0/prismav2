/**
 * Admin Configuration - Subjects Page
 * Server Component for managing school subjects
 *
 * Route: /config/subjects (admin only)
 */

import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
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
        {subjects.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma disciplina cadastrada
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
                      Disciplina
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {subject.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {subject.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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
