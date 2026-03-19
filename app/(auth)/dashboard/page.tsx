/**
 * Dashboard Page
 * Server Component for authenticated user dashboard
 *
 * Route: /dashboard (authenticated)
 * Displays: List of user's exams with status badges and action links
 *
 * Features:
 * - Fetch all exams for the current user from exams table
 * - Display status badges using getStatusBadgeVariant()
 * - Link to appropriate pages based on exam status:
 *   - draft → /exams/{id}/extraction
 *   - processing/uploading/awaiting_answers → /exams/{id}/processing
 *   - ready → /exams/{id}/result
 *   - error → show error state with retry option
 * - Empty state for users with no exams
 * - Create new exam button → /exams/new
 * - Responsive card layout
 */

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { getStatusBadgeVariant, getExamStatus } from '@/lib/utils/exam-status';
import type { ExamStatus } from '@/lib/types/extraction';

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all exams for the current authenticated user
 */
async function fetchUserExams(): Promise<Exam[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, title, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error || !exams) {
    return [];
  }

  return exams as Exam[];
}

/**
 * Determine the destination path based on exam status
 */
function getExamLink(exam: Exam): string {
  switch (exam.status) {
    case 'draft':
      return `/exams/${exam.id}/extraction`;
    case 'uploading':
    case 'processing':
    case 'awaiting_answers':
      return `/exams/${exam.id}/processing`;
    case 'ready':
      return `/exams/${exam.id}/result`;
    case 'error':
      return `/exams/${exam.id}/processing`;
    default:
      return `/exams/${exam.id}`;
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

export default async function DashboardPage() {
  const exams = await fetchUserExams();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Provas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie e adapte suas provas escolares com IA
            </p>
          </div>
          <Link href="/exams/new">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nova Prova
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {exams.length === 0 ? (
          <Card className="p-8 sm:p-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-muted p-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Nenhuma prova ainda
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Crie sua primeira prova para começar a adaptar com IA
                </p>
              </div>
              <Link href="/exams/new" className="mt-4">
                <Button>Criar Primeira Prova</Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Exams Grid */
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => {
              const statusInfo = getExamStatus(exam);
              const badgeVariant = getStatusBadgeVariant(exam.status);
              const examLink = getExamLink(exam);

              return (
                <Link key={exam.id} href={examLink}>
                  <Card className="h-full p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex flex-col h-full gap-4">
                      {/* Title and Status */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                          {exam.title}
                        </h3>
                        <Badge variant={badgeVariant} className="mt-2 self-start">
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Footer with date */}
                      <div className="text-xs text-muted-foreground pt-4 border-t">
                        Atualizado em {formatDate(exam.updated_at)}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
