/**
 * Processing Page
 * Server Component for real-time adaptation processing display
 *
 * Route: /exams/[id]/processing (authenticated, exam owner only)
 * Workflow: User submitted answers → NOW: show adaptation progress → redirect to result
 *
 * Renders:
 * - Exam name and "Processing Adaptations" status
 * - AdaptationProgress component with real-time polling
 * - Shows progress: X/Y questions processed
 * - Loading state with skeleton
 * - Error state with retry button
 * - Auto-redirect to /exams/{id}/result when status becomes 'ready'
 */

import { createClient } from '@/lib/supabase/server';
import { ProcessingProgressClient } from './processing-progress-client';
import { redirect } from 'next/navigation';

interface PageParams {
  params: Promise<{ id: string }>;
}

interface Exam {
  id: string;
  name: string;
  status: string;
  user_id: string;
}

/**
 * Fetch exam data with ownership verification
 */
async function fetchExam(examId: string): Promise<Exam | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, name, status, user_id')
    .eq('id', examId)
    .single();

  if (error || !exam) {
    return null;
  }

  // Verify ownership
  if (exam.user_id !== user.id) {
    return null;
  }

  return exam;
}

export default async function ProcessingPage({ params }: PageParams) {
  const { id: examId } = await params;

  // Fetch exam
  const exam = await fetchExam(examId);

  if (!exam) {
    redirect('/exams/new');
  }

  // Verify status is 'processing'
  if (exam.status !== 'processing') {
    redirect(`/exams/${examId}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-display-md font-display font-semibold text-foreground">
            {exam.name}
          </h1>
          <p className="text-body text-muted-foreground">
            Adaptando sua prova...
          </p>
        </div>

        {/* Progress Component */}
        <div className="pt-4">
          <ProcessingProgressClient examId={examId} />
        </div>

        {/* Subtitle */}
        <p className="text-small text-muted-foreground">
          Este processo pode levar alguns minutos
        </p>
      </div>
    </main>
  );
}
