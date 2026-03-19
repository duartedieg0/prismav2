/**
 * Result Page
 * Server Component for displaying exam results with adapted questions
 *
 * Route: /exams/[id]/result (authenticated, exam owner only, status=ready)
 * Workflow: Displays all adapted questions with feedback collection capability
 *
 * Renders:
 * - Exam metadata
 * - List of original questions with adaptations
 * - Feedback collection form for each question
 */

import { createClient } from '@/lib/supabase/server';
import ExamResultPage from '@/components/exam-result-page';
import { redirect } from 'next/navigation';

interface PageParams {
  params: Promise<{ id: string }>;
}

/**
 * Result Page Component
 * Verifies exam ownership and status, then renders result display
 */
export default async function ResultPage({ params }: PageParams) {
  const { id: examId } = await params;
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify exam exists and belongs to authenticated user
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('id, status, user_id')
    .eq('id', examId)
    .single();

  if (examError || !exam) {
    redirect('/dashboard');
  }

  // Verify exam belongs to authenticated user
  if (exam.user_id !== user.id) {
    redirect('/dashboard');
  }

  // Verify exam is ready for viewing results
  if (exam.status !== 'ready') {
    redirect(`/exams/${examId}/processing`);
  }

  // Render client component with exam ID
  return <ExamResultPage examId={examId} />;
}
