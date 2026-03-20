/**
 * ExtractionForm Component
 * Client Component for extracting and confirming questions with step-by-step navigation
 * - Displays one question at a time for focused review
 * - Manages form state for all questions
 * - Previous/Next buttons for navigation between questions
 * - Validates individual questions before advancing
 * - Submits to POST /api/exams/[id]/answers on final question
 * - Redirects to processing page on success
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const totalCount = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalCount - 1;

  /**
   * Validate current question: ensure it's answered
   */
  const validateCurrentQuestion = (): boolean => {
    const answer = answers[currentQuestion.id]?.trim();
    if (!answer) {
      setFieldErrors((prev) => ({
        ...prev,
        [currentQuestion.id]: 'Esta questão é obrigatória',
      }));
      return false;
    }
    return true;
  };

  /**
   * Handle moving to previous question
   */
  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((i) => i - 1);
      setSubmitError('');
      setFieldErrors({});
    }
  };

  /**
   * Handle moving to next question or submitting
   */
  const handleNextOrSubmit = async () => {
    if (!validateCurrentQuestion()) {
      return;
    }

    if (isLastQuestion) {
      // Validate all questions before submission
      const allAnswered = questions.every((q) => answers[q.id]?.trim());
      if (!allAnswered) {
        // Find first unanswered question and show error
        for (const q of questions) {
          if (!answers[q.id]?.trim()) {
            setFieldErrors((prev) => ({
              ...prev,
              [q.id]: 'Esta questão é obrigatória',
            }));
          }
        }
        return;
      }
      // Submit form
      await handleSubmit();
    } else {
      // Move to next question
      setCurrentQuestionIndex((i) => i + 1);
      setSubmitError('');
      setFieldErrors({});
    }
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
  const handleSubmit = async () => {
    setSubmitError('');
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

          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Pergunta {currentQuestionIndex + 1} de {totalCount}
              </p>
              <div className="mt-2 w-full bg-surface-container rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / totalCount) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
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

          {/* Current Question */}
          <div className="rounded-xl bg-card p-8 space-y-6">
            {/* Question Header */}
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Questão {currentQuestionIndex + 1} de {totalCount}
              </p>
              <h2 className="text-lg font-semibold text-foreground leading-relaxed">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Input Section */}
            <div className="space-y-4 border-t border-surface-container pt-6">
              {currentQuestion.question_type === 'objective' ? (
                // Objective question
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Selecione sua resposta <span className="text-destructive">*</span>
                  </label>
                  <div className="space-y-2">
                    {currentQuestion.alternatives &&
                      Object.entries(currentQuestion.alternatives).map(
                        ([key, text]) => (
                          <div
                            key={key}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-surface-container transition-colors"
                          >
                            <input
                              type="radio"
                              id={`alternative-${currentQuestion.id}-${key}`}
                              name={`question-${currentQuestion.id}`}
                              value={key}
                              checked={answers[currentQuestion.id] === key}
                              onChange={(e) =>
                                handleAnswerChange(
                                  currentQuestion.id,
                                  e.target.value
                                )
                              }
                              className="w-4 h-4"
                              aria-label={`Alternativa ${key.toUpperCase()}: ${text}`}
                            />
                            <label
                              htmlFor={`alternative-${currentQuestion.id}-${key}`}
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
                    htmlFor={`question-${currentQuestion.id}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Sua resposta <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id={`question-${currentQuestion.id}`}
                    placeholder="Digite sua resposta aqui..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.id, e.target.value)
                    }
                    className="w-full min-h-32 resize-none p-3 bg-surface-container-low rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    aria-invalid={!!fieldErrors[currentQuestion.id]}
                    aria-describedby={
                      fieldErrors[currentQuestion.id]
                        ? `error-${currentQuestion.id}`
                        : undefined
                    }
                  />
                </div>
              )}

              {/* Error Message */}
              {fieldErrors[currentQuestion.id] && (
                <div
                  id={`error-${currentQuestion.id}`}
                  className="text-sm text-destructive flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {fieldErrors[currentQuestion.id]}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex gap-3 pt-4 border-t border-surface-container justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading || isFirstQuestion}
              className="rounded-xl gap-2"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleNextOrSubmit}
                disabled={isLoading}
                className="rounded-xl font-display font-bold px-8 gap-2"
              >
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isLoading ? (
                  'Processando...'
                ) : isLastQuestion ? (
                  <>
                    Finalizar
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
