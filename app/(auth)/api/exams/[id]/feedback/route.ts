import { createClient } from '@/lib/supabase/server';
import { saveFeedbackSchema } from '@/lib/schemas/feedback';
import { ZodError } from 'zod';

/**
 * POST /api/exams/[id]/feedback
 * Saves teacher feedback on adapted question (fire-and-forget endpoint)
 *
 * Accepts JSON body with:
 * - adaptation_id (UUID, required)
 * - rating (0-5, optional if comment provided)
 * - comment (string ≤1000 chars, optional if rating provided)
 *
 * Returns:
 * - 201: { success: true, feedback: { id, adaptation_id, rating, comment } }
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Database failure
 */
export async function POST(
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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse JSON body
    const body = await request.json();

    // Validate input with Zod schema
    let validated;
    try {
      validated = saveFeedbackSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return Response.json({ error: message }, { status: 400 });
      }
      throw error;
    }

    // Save feedback to database
    const { data: feedback, error: insertError } = await supabase
      .from('feedbacks')
      .insert({
        exam_id: id,
        adaptation_id: validated.adaptation_id,
        rating: validated.rating || null,
        comment: validated.comment || null,
      })
      .select()
      .single();

    if (insertError || !feedback) {
      console.error('Failed to save feedback:', insertError);
      return Response.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        feedback: {
          id: feedback.id,
          adaptation_id: feedback.adaptation_id,
          rating: feedback.rating,
          comment: feedback.comment,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/exams/[id]/feedback error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
