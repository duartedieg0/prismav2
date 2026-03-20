import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/exams/[id]/status
 * Fetches the current status of an exam extraction process
 *
 * Route params:
 * - id (UUID): Exam identifier
 *
 * Returns:
 * - 200: { id, status, errorMessage? }
 * - 404: Exam not found or user lacks access
 * - 401: Unauthorized
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get exam ID from params
    const { id: examId } = await params;

    // Fetch exam — RLS will enforce user_id match
    const { data: exam, error } = await supabase
      .from('exams')
      .select('id, status, error_message, questions:questions(count), adaptations:adaptations(count)')
      .eq('id', examId)
      .eq('user_id', user.id)
      .single();

    if (error || !exam) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Calculate adaptation progress based on status
    const questionCount = (exam.questions as unknown as { count: number } | null)?.count ?? 0;
    const adaptationCount = (exam.adaptations as unknown as { count: number } | null)?.count ?? 0;
    const adaptationProgress = {
      completedCount: adaptationCount,
      totalCount: questionCount,
      progressPercent: questionCount > 0 ? Math.round((adaptationCount / questionCount) * 100) : 0,
    };

    return Response.json({
      id: exam.id,
      status: exam.status,
      errorMessage: exam.error_message || undefined,
      adaptationProgress,
    });
  } catch (error) {
    console.error('GET /api/exams/[id]/status error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
