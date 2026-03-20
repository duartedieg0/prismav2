/**
 * Dashboard Page
 * Server Component for authenticated user dashboard with client-side exam management
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
 * - Edit button (PencilIcon) → navigate to exam edit page
 * - Delete button (Trash2Icon) with confirmation dialog
 */

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import type { ExamStatus } from '@/lib/types/extraction';

interface Subject {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  grade_level?: GradeLevel | null;
}

interface RawExamResponse {
  id: string;
  title: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
  subject: Subject[] | Subject | null;
  grade_level: GradeLevel[] | GradeLevel | null;
}

/**
 * Fetch all exams for the current authenticated user with related data
 */
async function fetchUserExams(): Promise<Exam[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: rawExams, error } = await supabase
    .from('exams')
    .select(`
      id,
      title,
      status,
      created_at,
      updated_at,
      subject:subject_id (id, name),
      grade_level:grade_level_id (id, name)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error || !rawExams) {
    return [];
  }

  // Transform Supabase response (arrays) into our Exam type (single objects)
  const exams = rawExams.map((exam: RawExamResponse) => ({
    id: exam.id,
    title: exam.title,
    status: exam.status,
    created_at: exam.created_at,
    updated_at: exam.updated_at,
    subject: Array.isArray(exam.subject) ? exam.subject[0] : exam.subject,
    grade_level: Array.isArray(exam.grade_level) ? exam.grade_level[0] : exam.grade_level,
  })) as Exam[];

  return exams;
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

import { ExamCard } from './exam-card';

export default async function DashboardPage() {
  const exams = await fetchUserExams();

  // Calculate statistics
  const stats = {
    total: exams.length,
    ready: exams.filter(e => e.status === 'ready').length,
    processing: exams.filter(e => ['uploading', 'processing', 'awaiting_answers'].includes(e.status)).length,
    draft: exams.filter(e => e.status === 'draft').length,
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header Section — Editorial feel with deep typography */}
      <div className="bg-background pt-12 pb-8 px-4 sm:px-6">
        <div className="w-full max-w-6xl mx-auto">
          {/* Greeting + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-12">
            <div className="flex-1">
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground mb-2">
                Minhas Provas
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground font-sans">
                Gerencie e adapte suas avaliações escolares.
              </p>
            </div>
            <Link href="/exams/new" className="flex-shrink-0">
              <Button variant="default" className="gap-2 bg-tertiary hover:bg-tertiary/90 text-white whitespace-nowrap">
                <Plus className="w-4 h-4" />
                Nova Prova
              </Button>
            </Link>
          </div>

          {/* Statistics Cards — Surface hierarchy, no borders */}
          {stats.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {/* Card: Total Exams */}
              <div className="bg-surface-container-low rounded-lg p-6">
                <p className="text-xs font-mono text-muted-foreground uppercase mb-2">
                  Atividade Recente
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    {stats.total}
                  </span>
                  <span className="text-sm text-muted-foreground font-sans">
                    Provas
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-sans">
                  {stats.total === 1 ? 'Adaptada este mês' : 'Adaptadas este mês'}
                </p>
              </div>

              {/* Card: Processing */}
              <div className="bg-surface-container-low rounded-lg p-6">
                <p className="text-xs font-mono text-muted-foreground uppercase mb-2">
                  Em Processamento
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-accent">
                    {String(stats.processing).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-sans">
                  {stats.processing === 1 ? 'Prova em processamento' : 'Provas em processamento'}
                </p>
              </div>

              {/* Card: Ready */}
              <div className="bg-surface-container-low rounded-lg p-6">
                <p className="text-xs font-mono text-muted-foreground uppercase mb-2">
                  Prontas para Resultado
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-success">
                    {String(stats.ready).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-sans">
                  {stats.ready === 1 ? 'Prova pronta' : 'Provas prontas'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exams Section */}
      <div className="bg-background px-4 sm:px-6 py-8">
        <div className="w-full max-w-6xl mx-auto">

          {/* Empty State */}
          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 text-center py-16">
              <div className="rounded-full bg-surface-container-low p-6">
                <ClipboardList className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="max-w-sm">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Nenhuma prova ainda
                </h2>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Crie sua primeira prova para começar a adaptar com IA
                </p>
              </div>
              <Link href="/exams/new" className="mt-4">
                <Button className="gap-2 bg-tertiary hover:bg-tertiary/90 text-white">
                  <Plus className="w-4 h-4" />
                  Criar Primeira Prova
                </Button>
              </Link>
            </div>
          ) : (
            /* Exams Grid — Editorial card layout */
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => {
                const statusConfig = getStatusConfig(exam.status);
                const actionHref = getActionHref(exam);

                return (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    statusConfig={statusConfig}
                    actionHref={actionHref}
                    formatRelativeDate={formatRelativeDate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
