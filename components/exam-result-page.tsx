'use client';

/**
 * ExamResultPage Component
 * Main page showing all adapted questions with feedback collection
 *
 * Props:
 * - examId: UUID of the exam to display results for
 */

import { useEffect, useState, useCallback } from 'react';
import QuestionResultCard from './question-result-card';
import { Button } from '@/components/ui/button';
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || 'Failed to load exam results'}</p>
          <Button variant="outline" onClick={fetchExamResult}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
        {exam.topic && (
          <p className="text-gray-600">Topic: {exam.topic}</p>
        )}
        <p className="text-sm text-gray-500">
          {exam.questions.length} question{exam.questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Questions */}
      {exam.questions.length === 0 ? (
        <div className="bg-gray-50 border rounded-lg p-8 text-center">
          <p className="text-gray-600">No questions found in this exam</p>
        </div>
      ) : (
        <div className="space-y-6">
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
      <div className="border-t pt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-semibold text-blue-900 mb-2">Feedback Summary</h2>
          <p className="text-blue-700 text-sm mb-4">
            You have provided feedback on {feedbacks.length} question{feedbacks.length !== 1 ? 's' : ''}.
          </p>
          <Button onClick={fetchExamResult} variant="outline">
            Refresh Results
          </Button>
        </div>
      </div>
    </main>
  );
}
