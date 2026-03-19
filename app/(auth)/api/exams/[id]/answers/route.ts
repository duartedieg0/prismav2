import { createClient } from '@/lib/supabase/server';
import { submitAnswersSchema } from '@/lib/schemas/adaptation';
import { ZodError } from 'zod';

/**
 * POST /api/exams/[id]/answers
 * Accepts correct answers, creates adaptation records, triggers Edge Function
 *
 * Spec: spec-process-adaptation.md Section 4.4
 * ACs: AC-001, AC-005, AC-006, AC-007, AC-008, AC-009
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // AC-006: Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { id: examId } = await params;

    // Fetch exam with ownership check (AC-007)
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

    // AC-005: Validate exam status
    if (exam.status !== 'awaiting_answers') {
      return Response.json(
        { error: 'INVALID_STATUS', details: "Exam must be in 'awaiting_answers' status" },
        { status: 409 }
      );
    }

    // Parse and validate request body (Zod)
    const body = await request.json();
    let validated;
    try {
      validated = submitAnswersSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json(
          { error: 'VALIDATION_ERROR', details: error.issues[0]?.message || 'Validation error' },
          { status: 400 }
        );
      }
      throw error;
    }

    // Fetch exam questions for DB-state validation
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, alternatives')
      .eq('exam_id', examId);

    if (questionsError || !questions) {
      return Response.json({ error: 'EXAM_NOT_FOUND' }, { status: 404 });
    }

    // Validate: no duplicate questionIds
    const submittedIds = validated.answers.map((a) => a.questionId);
    const uniqueIds = new Set(submittedIds);
    if (uniqueIds.size !== submittedIds.length) {
      return Response.json(
        { error: 'VALIDATION_ERROR', details: 'Duplicate questionId entries' },
        { status: 400 }
      );
    }

    // Validate: every questionId belongs to this exam
    const questionIds = new Set(questions.map((q) => q.id));
    for (const answer of validated.answers) {
      if (!questionIds.has(answer.questionId)) {
        return Response.json(
          { error: 'VALIDATION_ERROR', details: `Question ${answer.questionId} does not belong to this exam` },
          { status: 400 }
        );
      }
    }

    // AC-009 / CON-004: MC questions require correctAnswer, essay questions don't
    const answersMap = new Map(
      validated.answers.map((a) => [a.questionId, a.correctAnswer])
    );
    const mcWithoutAnswer = questions.filter(
      (q) => q.alternatives != null && !answersMap.get(q.id)
    );
    if (mcWithoutAnswer.length > 0) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          details: `Missing correctAnswer for ${mcWithoutAnswer.length} multiple-choice question${mcWithoutAnswer.length > 1 ? 's' : ''}`,
        },
        { status: 400 }
      );
    }

    // Side effect 1: Set correct_answer on questions
    for (const answer of validated.answers) {
      if (answer.correctAnswer) {
        await supabase
          .from('questions')
          .update({ correct_answer: answer.correctAnswer })
          .eq('id', answer.questionId);
      }
    }

    // Fetch supports linked to this exam
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id')
      .eq('exam_id', examId);

    const supportIds = (examSupports || []).map((es) => es.support_id);

    // Side effect 2: Create adaptation records (question × support)
    const adaptationRecords = questions.flatMap((q) =>
      supportIds.map((supportId) => ({
        question_id: q.id,
        support_id: supportId,
        status: 'pending',
      }))
    );

    if (adaptationRecords.length > 0) {
      await supabase.from('adaptations').insert(adaptationRecords);
    }

    // Side effect 3: Set exam status to 'processing'
    await supabase
      .from('exams')
      .update({ status: 'processing' })
      .eq('id', examId);

    // Side effect 4: Invoke Edge Function (fire-and-forget)
    supabase.functions.invoke('analyze-and-adapt', {
      body: { examId, userId: user.id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/exams/[id]/answers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
