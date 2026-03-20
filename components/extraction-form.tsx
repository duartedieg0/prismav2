/**
 * ExtractionForm Component
 * Client Component for extracting and confirming questions
 * - Manages form state for all questions
 * - Tracks which questions are confirmed
 * - Validates that all questions are confirmed before submission
 * - Submits to POST /api/exams/[id]/answers
 * - Redirects to processing page on success
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Check } from 'lucide-react';

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
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  // Calculate confirmation progress
  const confirmedCount = confirmedIds.size;
  const totalCount = questions.length;
  const isFullyConfirmed = confirmedCount === totalCount && totalCount > 0;

  // Toggle confirmation for a question
  const toggleConfirmation = (questionId: string) => {
    setConfirmedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Confirm all questions
  const confirmAll = () => {
    const allIds = new Set(questions.map((q) => q.id));
    setConfirmedIds(allIds);
  };

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
    <div className="min-h-screen bg-surface-container-low py-10 px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Revisão de Extração
          </p>
          <h1 className="text-4xl font-display font-black text-foreground tracking-tight mb-3">
            {examName}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Revise as questões extraídas do PDF e forneça as respostas corretas antes de adaptar.
          </p>

          {/* Review Section with Confirm All Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-foreground">
                Revisar Questões Extraídas
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {confirmedCount} de {totalCount} confirmadas
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={confirmAll}
              disabled={isFullyConfirmed}
              className="rounded-lg"
            >
              Confirmar todas
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Submit Error Alert */}
          {submitError && (
            <div
              className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">
                  {submitError}
                </p>
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((question, index) => {
              const isConfirmed = confirmedIds.has(question.id);
              return (
                <div
                  key={question.id}
                  className="rounded-xl bg-card p-8 space-y-6 transition-all"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        Questão {index + 1} de {totalCount}
                      </p>
                      <h2 className="text-lg font-semibold text-foreground leading-relaxed">
                        {question.question_text}
                      </h2>
                    </div>
                    {isConfirmed && (
                      <div className="flex-shrink-0 flex items-center gap-1.5 text-primary font-medium text-sm">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Confirmada
                      </div>
                    )}
                  </div>

                  {/* Input Section */}
                  <div className="space-y-4 border-t border-surface-container pt-6">
                    {question.question_type === 'objective' ? (
                      // Objective question - render inline
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                          Selecione sua resposta <span className="text-destructive">*</span>
                        </label>
                        <div className="space-y-2">
                          {question.alternatives &&
                            Object.entries(question.alternatives).map(
                              ([key, text]) => (
                                <div
                                  key={key}
                                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-surface-container transition-colors"
                                >
                                  <input
                                    type="radio"
                                    id={`alternative-${question.id}-${key}`}
                                    name={`question-${question.id}`}
                                    value={key}
                                    checked={answers[question.id] === key}
                                    onChange={(e) =>
                                      handleAnswerChange(
                                        question.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-4 h-4"
                                    aria-label={`Alternativa ${key.toUpperCase()}: ${text}`}
                                  />
                                  <label
                                    htmlFor={`alternative-${question.id}-${key}`}
                                    className="flex-1 cursor-pointer text-sm leading-relaxed"
                                  >
                                    <span className="font-medium text-foreground">
                                      {key.toUpperCase()}.
                                    </span>{' '}
                                    <span className="text-foreground">{text}</span>
                                  </label>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    ) : (
                      // Essay question
                      <div className="space-y-3">
                        <label
                          htmlFor={`question-${question.id}`}
                          className="block text-sm font-medium text-foreground"
                        >
                          Sua resposta <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          id={`question-${question.id}`}
                          placeholder="Digite sua resposta aqui..."
                          value={answers[question.id] || ''}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="w-full min-h-32 resize-none p-3 bg-surface-container-low rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                          aria-invalid={!!fieldErrors[question.id]}
                          aria-describedby={
                            fieldErrors[question.id]
                              ? `error-${question.id}`
                              : undefined
                          }
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {fieldErrors[question.id] && (
                      <div
                        id={`error-${question.id}`}
                        className="text-sm text-destructive flex items-center gap-2"
                        role="alert"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {fieldErrors[question.id]}
                      </div>
                    )}
                  </div>

                  {/* Confirmation Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant={isConfirmed ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleConfirmation(question.id)}
                    >
                      {isConfirmed ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Confirmada
                        </>
                      ) : (
                        'Confirmar'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-container justify-end">
              <Button
                type="submit"
                disabled={isLoading || !isFullyConfirmed}
                className="rounded-xl font-display font-bold px-8 gap-2 flex-1 sm:flex-none"
              >
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isLoading ? 'Processando...' : 'Próximo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="rounded-xl"
              >
                Cancelar
              </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
