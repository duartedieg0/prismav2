/**
 * Dashboard Page
 * Server Component for authenticated user dashboard
 *
 * Route: /dashboard (authenticated)
 * Displays: List of user's exams with status badges and action links
 *
 * Features:
 * - Fetch all exams for the current user from exams table
 * - Display status badges using contextual styling
 * - Exam cards with colored left border indicating status
 * - Link to appropriate pages based on exam status:
 *   - draft → /exams/{id}/extraction
 *   - processing → disabled action button
 *   - ready → /exams/{id}/result
 *   - error → /exams/new
 *   - archived → /exams/{id}/result
 * - Empty state for users with no exams
 * - Create new exam button → /exams/new
 * - Responsive card layout (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
 */

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
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
 * Format relative time (e.g., "há 5 min", "há 2h", "há 3 dias")
 */
function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return `há ${months} meses`;
}

/**
 * Status configuration with bar color, badge variant, and action label
 */
interface StatusConfig {
  barColor: string;
  badgeVariant: 'status-draft' | 'status-processing' | 'status-ready' | 'status-error' | 'status-archived';
  badgeLabel: string;
  actionLabel: string;
  actionDisabled: boolean;
}

function getStatusConfig(status: ExamStatus | 'archived'): StatusConfig {
  const configs: Record<ExamStatus | 'archived', StatusConfig> = {
    draft: {
      barColor: 'bg-muted-foreground',
      badgeVariant: 'status-draft',
      badgeLabel: 'Rascunho',
      actionLabel: 'Continuar',
      actionDisabled: false,
    },
    uploading: {
      barColor: 'bg-accent',
      badgeVariant: 'status-processing',
      badgeLabel: 'Processando',
      actionLabel: 'Aguardando...',
      actionDisabled: true,
    },
    processing: {
      barColor: 'bg-accent',
      badgeVariant: 'status-processing',
      badgeLabel: 'Processando',
      actionLabel: 'Aguardando...',
      actionDisabled: true,
    },
    awaiting_answers: {
      barColor: 'bg-accent',
      badgeVariant: 'status-processing',
      badgeLabel: 'Processando',
      actionLabel: 'Aguardando...',
      actionDisabled: true,
    },
    ready: {
      barColor: 'bg-success',
      badgeVariant: 'status-ready',
      badgeLabel: 'Pronto',
      actionLabel: 'Ver Resultado',
      actionDisabled: false,
    },
    error: {
      barColor: 'bg-destructive',
      badgeVariant: 'status-error',
      badgeLabel: 'Erro',
      actionLabel: 'Tentar Novamente',
      actionDisabled: false,
    },
    archived: {
      barColor: 'bg-muted-foreground',
      badgeVariant: 'status-archived',
      badgeLabel: 'Arquivado',
      actionLabel: 'Ver Arquivo',
      actionDisabled: false,
    },
  };
  return configs[status] || configs.draft;
}

/**
 * Get action href based on exam status
 */
function getActionHref(exam: Exam): string {
  switch (exam.status) {
    case 'draft':
      return `/exams/${exam.id}/extraction`;
    case 'ready':
      return `/exams/${exam.id}/result`;
    case 'error':
      return `/exams/new`;
    case 'uploading':
    case 'processing':
    case 'awaiting_answers':
      return '#'; // No navigation for processing states
    default:
      return `/exams/${exam.id}/result`;
  }
}

export default async function DashboardPage() {
  const exams = await fetchUserExams();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Minhas Provas</h1>
          <Link href="/exams/new">
            <Button variant="accent" className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nova Prova
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
            <div className="rounded-full bg-muted p-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
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
        ) : (
          /* Exams Grid */
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => {
              const statusConfig = getStatusConfig(exam.status);
              const actionHref = getActionHref(exam);

              return (
                <Card
                  key={exam.id}
                  className="h-full p-6 hover:shadow-md transition-shadow overflow-hidden flex flex-col relative"
                >
                  {/* Left border indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.barColor}`} />

                  <div className="flex flex-col h-full gap-4 pl-0">
                    {/* Title section */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                        {exam.title}
                      </h3>
                    </div>

                    {/* Metadata: relative time */}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(exam.updated_at)}
                    </p>

                    {/* Status badge */}
                    <Badge
                      variant={statusConfig.badgeVariant}
                      className="w-fit"
                    >
                      {statusConfig.badgeLabel}
                    </Badge>

                    {/* Action button */}
                    <Link
                      href={actionHref}
                      className="mt-auto"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={statusConfig.actionDisabled}
                        className="w-full"
                      >
                        {statusConfig.actionLabel}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
