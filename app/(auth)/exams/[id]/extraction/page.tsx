/**
 * Extraction Page
 * Server Component for exam extraction workflow (awaiting answers)
 *
 * Route: /exams/[id]/extraction (authenticated, exam owner only)
 * Workflow: PDF extracted → questions display → user answers → submit to process
 *
 * Renders:
 * - Exam name and status
 * - All extracted questions via ExtractionForm
 * - Form submission to POST /api/exams/[id]/answers
 * - Redirect to /exams/[id]/processing on success
 */

import { createClient } from '@/lib/supabase/server';
import { ExtractionForm } from '@/components/extraction-form';
import { Card } from '@/components/ui/card';
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

interface Question {
  id: string;
  question_text: string;
  question_type: 'objective' | 'essay';
  alternatives?: Record<string, string> | null;
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

/**
 * Fetch all questions for an exam
 */
async function fetchQuestions(examId: string): Promise<Question[]> {
  const supabase = await createClient();

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, question_type, alternatives')
    .eq('exam_id', examId)
    .order('created_at', { ascending: true });

  if (error || !questions) {
    return [];
  }

  return questions as Question[];
}

export default async function ExtractionPage({ params }: PageParams) {
  const { id: examId } = await params;

  // Fetch exam
  const exam = await fetchExam(examId);

  if (!exam) {
    redirect('/exams/new');
  }

  // Verify status is 'awaiting_answers'
  if (exam.status !== 'awaiting_answers') {
    redirect(`/exams/${examId}`);
  }

  // Fetch questions
  const questions = await fetchQuestions(examId);

  // Handle empty questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
          <Card className="p-6 sm:p-8">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Responder Questões</h1>
              <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
                <p className="text-sm">
                  Nenhuma questão foi extraída do PDF. Por favor, tente novamente
                  ou entre em contato com o administrador.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <ExtractionForm
        examId={examId}
        examName={exam.name}
        questions={questions}
      />
    </main>
  );
}
