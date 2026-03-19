import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/exams/[id]/adaptation-status
 * Polls adaptation progress for AdaptationProgress component
 *
 * Spec: spec-process-adaptation.md Section 4.4
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { id: examId } = await params;

    // Fetch exam with ownership check
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, status, user_id')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return Response.json({ error: 'EXAM_NOT_FOUND' }, { status: 404 });
    }

    if (exam.user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Fetch question IDs for this exam, then count adaptation statuses
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('exam_id', examId);

    const questionIds = (questions || []).map((q) => q.id);

    const { data: adaptations } = questionIds.length > 0
      ? await supabase
          .from('adaptations')
          .select('status')
          .in('question_id', questionIds)
      : { data: [] };

    const total = adaptations?.length || 0;
    const completed = adaptations?.filter((a) => a.status === 'completed').length || 0;
    const errored = adaptations?.filter((a) => a.status === 'error').length || 0;

    // Determine overall status
    let status: 'processing' | 'ready' | 'error';
    if (total === 0) {
      status = 'processing';
    } else if (completed + errored === total) {
      status = 'ready';
    } else {
      status = 'processing';
    }

    return Response.json({
      status,
      totalAdaptations: total,
      completedAdaptations: completed,
      errorAdaptations: errored,
    });
  } catch (error) {
    console.error('GET /api/exams/[id]/adaptation-status error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
