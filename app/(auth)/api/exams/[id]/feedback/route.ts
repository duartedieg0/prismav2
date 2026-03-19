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
  // Note: 'id' param is in the signature for routing but we use adaptation.exam_id for validation
  await params;
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
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
        return Response.json({ error: 'VALIDATION_ERROR', details: message }, { status: 400 });
      }
      throw error;
    }

    // Verify adaptation exists
    const { data: adaptation } = await supabase
      .from('adaptations')
      .select('id, exam_id')
      .eq('id', validated.adaptation_id)
      .single();

    if (!adaptation) {
      return Response.json(
        { error: 'ADAPTATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify exam belongs to authenticated user
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', adaptation.exam_id)
      .single();

    if (!exam) {
      return Response.json(
        { error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Upsert feedback to database (replace if already exists for this adaptation+user)
    const { error: upsertError } = await supabase
      .from('feedbacks')
      .upsert({
        adaptation_id: validated.adaptation_id,
        user_id: user.id,
        rating: validated.rating || null,
        comment: validated.comment || null,
        dismissed_from_evolution: false,
      }, {
        onConflict: 'adaptation_id,user_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to save feedback:', upsertError);
      return Response.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return Response.json(
      { ok: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/exams/[id]/feedback error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
