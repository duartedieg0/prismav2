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
      .select('id, status, error_message')
      .eq('id', examId)
      .eq('user_id', user.id)
      .single();

    if (error || !exam) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({
      id: exam.id,
      status: exam.status,
      errorMessage: exam.error_message || undefined,
    });
  } catch (error) {
    console.error('GET /api/exams/[id]/status error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
