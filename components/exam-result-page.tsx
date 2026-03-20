'use client';

/**
 * ExamResultPage Component
 * Main page showing all adapted questions with feedback collection
 *
 * Props:
 * - examId: UUID of the exam to display results for
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import QuestionResultCard from './question-result-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Question } from '@/lib/types/extraction';
import type { Adaptation } from '@/lib/types/adaptation';
import type { QuestionFeedback } from '@/lib/types/feedback';

interface ExamWithData {
  id: string;
  title: string;
  topic: string | null;
  subject_id: string;
  grade_level_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  questions: (Question & {
    adaptations: Adaptation[];
  })[];
}

interface ExamResultPageProps {
  examId: string;
}

export default function ExamResultPage({ examId }: ExamResultPageProps) {
  const [exam, setExam] = useState<ExamWithData | null>(null);
  const [feedbacks, setFeedbacks] = useState<QuestionFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamResult = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/exams/${examId}/result`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Exam not found');
        } else {
          setError('Failed to load exam results');
        }
        return;
      }

      const data = await response.json();
      setExam(data.exam);
      setFeedbacks(data.feedbacks || []);
    } catch (err) {
      console.error('Failed to fetch exam result:', err);
      setError('Failed to load exam results');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExamResult();
  }, [examId, fetchExamResult]);

  const handleFeedbackSubmit = async (feedbackData: {
    adaptation_id: string;
    rating?: number | null;
    comment?: string | null;
  }) => {
    try {
      const response = await fetch(`/api/exams/${examId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to save feedback');
      }

      const result = await response.json();
      if (result.feedback) {
        setFeedbacks((prev) => [result.feedback, ...prev]);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="h-10 bg-surface-container-low rounded w-2/3 animate-pulse" />
            <div className="h-48 bg-surface-container-low rounded animate-pulse" />
            <div className="h-48 bg-surface-container-low rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-destructive/10 rounded-lg p-6 sm:p-8">
            <h2 className="font-display text-heading font-bold text-destructive mb-3">
              Erro ao carregar resultados
            </h2>
            <p className="text-body text-muted-foreground mb-6">
              {error || 'Não foi possível carregar os resultados da adaptação'}
            </p>
            <Button onClick={fetchExamResult} variant="outline" size="sm">
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-10 sm:mb-12">
          {/* Back Button */}
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Voltar
            </Link>
          </Button>

          {/* Page Title and Metadata */}
          <div className="mb-8">
            <h1 className="text-display-md font-display font-bold text-foreground mb-2">
              Resultado da Adaptação
            </h1>
            {exam.title && (
              <p className="text-body text-muted-foreground">
                {exam.title}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" size="sm">
              Exportar PDF
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary-container">
              <Link href="/dashboard/exams" className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Nova Prova
              </Link>
            </Button>
          </div>
        </div>

        {/* Questions Section */}
        {exam.questions.length === 0 ? (
          <div className="bg-surface-container-low rounded-lg p-8 sm:p-10 text-center">
            <p className="text-body text-muted-foreground">
              Nenhuma questão encontrada nesta prova
            </p>
          </div>
        ) : (
          <div className="space-y-6 mb-12">
            {exam.questions.map((question) => {
              const adaptation = question.adaptations?.[0];
              if (!adaptation) return null;

              const questionFeedback = feedbacks.find(
                (f) => f.adaptation_id === adaptation.id
              ) || null;

              return (
                <QuestionResultCard
                  key={question.id}
                  question={question}
                  adaptation={adaptation}
                  feedback={questionFeedback}
                  onFeedbackSubmit={handleFeedbackSubmit}
                />
              );
            })}
          </div>
        )}

        {/* Summary Section */}
        <div className="border-t border-border pt-10">
          <div className="bg-surface-container-low rounded-lg p-6 sm:p-8">
            <h2 className="font-display text-heading font-bold text-foreground mb-3">
              Resumo de Feedback
            </h2>
            <p className="text-body text-muted-foreground mb-6">
              Você forneceu feedback em {feedbacks.length} questão{feedbacks.length !== 1 ? 's' : ''}.
            </p>
            <Button onClick={fetchExamResult} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
