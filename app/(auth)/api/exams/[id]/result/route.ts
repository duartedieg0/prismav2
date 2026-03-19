import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/exams/[id]/result
 * Retrieves exam with questions, adaptations, and feedback for result page
 *
 * Returns:
 * - 200: { exam, questions: [...], adaptations: [...], feedbacks: [...] }
 * - 401: Unauthorized
 * - 404: Exam not found
 * - 500: Database error
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    // Fetch exam with all related data
    // Query: exams with questions -> adaptations -> feedback
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(
        `
        id,
        title,
        topic,
        subject_id,
        grade_level_id,
        status,
        created_at,
        updated_at,
        questions:questions(
          id,
          question_text,
          question_type,
          alternatives,
          correct_answer,
          order_number,
          created_at,
          adaptations:adaptations(
            id,
            adapted_statement,
            adapted_alternatives,
            bncc_skill_code,
            bncc_skill_description,
            bloom_level,
            bloom_justification,
            status,
            created_at
          )
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (examError || !exam) {
      return Response.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Verify exam is ready for viewing
    if (exam.status !== 'ready') {
      return Response.json({ error: 'Exam not ready' }, { status: 404 });
    }

    // Fetch all feedback for this exam
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('feedbacks')
      .select('id, adaptation_id, rating, comment, created_at')
      .eq('exam_id', id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Failed to fetch feedbacks:', feedbackError);
      return Response.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return Response.json(
      {
        exam,
        feedbacks: feedbacks || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/exams/[id]/result error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
