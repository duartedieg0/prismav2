import { createClient } from '@/lib/supabase/server';
import { createExamSchema } from '@/lib/schemas/extraction';
import { ZodError } from 'zod';

/**
 * POST /api/exams
 * Creates a new exam and initiates PDF extraction process
 *
 * Accepts FormData with:
 * - subjectId (UUID)
 * - gradeLevelId (UUID)
 * - topic (optional, max 500 chars)
 * - supportIds (optional, array of UUIDs)
 * - pdf (File, ≤25 MB, application/pdf)
 *
 * Returns:
 * - 201: { id, status: "uploading" }
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Database or storage failure
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const subjectId = formData.get('subjectId');
    const gradeLevelId = formData.get('gradeLevelId');
    const topic = formData.get('topic');
    const supportIds = formData.getAll('supportIds');
    const pdf = formData.get('pdf');

    // Validate input with Zod schema
    const input = {
      subjectId,
      gradeLevelId,
      topic,
      supportIds,
      pdf,
    };

    let validated;
    try {
      validated = createExamSchema.parse(input);
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return Response.json({ error: message }, { status: 400 });
      }
      throw error;
    }

    // Create exam record with status 'uploading'
    const { data: exam, error: insertError } = await supabase
      .from('exams')
      .insert({
        user_id: user.id,
        subject_id: validated.subjectId,
        grade_level_id: validated.gradeLevelId,
        topic: validated.topic || null,
        status: 'uploading',
      })
      .select()
      .single();

    if (insertError || !exam) {
      console.error('Failed to create exam:', insertError);
      return Response.json(
        { error: 'Failed to create exam' },
        { status: 500 }
      );
    }

    // Upload PDF to Storage at path: exams/{userId}/{examId}.pdf
    const filePath = `${user.id}/${exam.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('exams')
      .upload(filePath, validated.pdf);

    if (uploadError) {
      // Clean up: delete exam if upload fails
      console.error('PDF upload failed:', uploadError);
      await supabase.from('exams').delete().eq('id', exam.id);
      return Response.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      );
    }

    // Update status to 'processing'
    // TODO: Trigger extract-questions Edge Function asynchronously
    // For now, we update the status and rely on a separate job/webhook to trigger extraction
    const { error: updateError } = await supabase
      .from('exams')
      .update({ status: 'processing' })
      .eq('id', exam.id);

    if (updateError) {
      console.error('Failed to update exam status:', updateError);
      return Response.json(
        { error: 'Failed to update exam status' },
        { status: 500 }
      );
    }

    return Response.json(
      { id: exam.id, status: 'uploading' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/exams error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
