/**
 * New Exam Page
 * Server Component that fetches subjects, grade levels, and supports
 * Renders NewExamForm client component with data
 *
 * Route: /exams/new (authenticated only via middleware)
 */

import { createClient } from '@/lib/supabase/server';
import { NewExamForm } from '@/components/new-exam-form';
import { Card } from '@/components/ui/card';

interface Subject {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  level: number;
}

interface Support {
  id: string;
  name: string;
  description?: string;
}

async function fetchSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }

  return data || [];
}

async function fetchGradeLevels(): Promise<GradeLevel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('grade_levels')
    .select('id, name, level')
    .order('level');

  if (error) {
    console.error('Error fetching grade levels:', error);
    return [];
  }

  return data || [];
}

async function fetchSupports(): Promise<Support[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('educational_supports')
    .select('id, name, description')
    .order('name');

  if (error) {
    console.error('Error fetching supports:', error);
    return [];
  }

  return data || [];
}

export default async function NewExamPage() {
  const [subjects, gradeLevels, supports] = await Promise.all([
    fetchSubjects(),
    fetchGradeLevels(),
    fetchSupports(),
  ]);

  // Handle empty data states
  if (subjects.length === 0 || gradeLevels.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Nova Prova</h1>
            <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
              <p className="text-sm">
                Não foi possível carregar os dados necessários. Por favor, contate o administrador.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (supports.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Nova Prova</h1>
            <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
              <p className="text-sm">
                Nenhum suporte educacional configurado. Por favor, contate o administrador.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <NewExamForm
        subjects={subjects}
        gradeLevels={gradeLevels}
        supports={supports}
      />
    </main>
  );
}
