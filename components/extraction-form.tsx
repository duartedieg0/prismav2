/**
 * ExtractionForm Component
 * Client Component for answering extraction questions
 * - Manages form state for all questions
 * - Validates that all questions are answered
 * - Submits answers to POST /api/exams/[id]/answers
 * - Redirects to processing page on success
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuestionInput } from '@/components/question-input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: 'objective' | 'essay';
  alternatives?: Record<string, string> | null;
}

interface ExtractionFormProps {
  examId: string;
  examName: string;
  questions: Question[];
}

export function ExtractionForm({
  examId,
  examName,
  questions,
}: ExtractionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  /**
   * Validate form: ensure all questions are answered
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const question of questions) {
      const answer = answers[question.id]?.trim();
      if (!answer) {
        errors[question.id] = 'Esta questão é obrigatória';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  /**
   * Handle answer change for a question
   */
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    // Clear error for this field if it becomes non-empty
    if (value.trim()) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  /**
   * Submit answers to API
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Build payload: for objective questions, submit answer; for essay, no correctAnswer needed
      const submissionAnswers = questions
        .filter((q) => q.question_type === 'objective')
        .map((q) => ({
          questionId: q.id,
          correctAnswer: answers[q.id],
        }));

      const payload = {
        answers: submissionAnswers,
      };

      const response = await fetch(`/api/exams/${examId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.details || errorData.error || 'Erro ao enviar respostas';
        setSubmitError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success: redirect to processing page
      router.push(`/exams/${examId}/processing`);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(
        'Erro ao enviar respostas. Por favor, verifique sua conexão e tente novamente.'
      );
      setIsLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Responder Questões</h1>
            <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
              <p className="text-sm">
                Nenhuma questão foi extraída do PDF. Por favor, tente novamente.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{examName}</h1>
          <p className="text-base text-muted-foreground">
            Responda todas as {questions.length} {questions.length === 1 ? 'questão' : 'questões'} abaixo
          </p>
        </div>

        {/* Submit Error Alert */}
        {submitError && (
          <div
            className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3 items-start"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold">Erro ao enviar respostas</p>
              <p className="mt-1">{submitError}</p>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionInput
              key={question.id}
              question={question}
              questionNumber={index + 1}
              value={answers[question.id] || ''}
              onChange={(value) => handleAnswerChange(question.id, value)}
              error={fieldErrors[question.id]}
              isRequired
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Enviando respostas...' : 'Enviar Respostas'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
