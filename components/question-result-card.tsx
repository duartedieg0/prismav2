'use client';

/**
 * QuestionResultCard Component
 * Displays adapted question with BNCC/Bloom analysis and feedback collection
 *
 * Props:
 * - question: Original question data
 * - adaptation: Adapted question with pedagogical analysis
 * - feedback: Existing feedback (if any)
 * - onFeedbackSubmit: Callback when user submits rating/comment
 */

import { useState } from 'react';
import { Copy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { copyToClipboard, formatQuestionForClipboard } from '@/lib/utils/copyable-block';
import type { Question } from '@/lib/types/extraction';
import type { Adaptation } from '@/lib/types/adaptation';
import type { QuestionFeedback } from '@/lib/types/feedback';

interface QuestionResultCardProps {
  question: Question;
  adaptation: Adaptation;
  feedback: QuestionFeedback | null;
  onFeedbackSubmit: (feedback: {
    adaptation_id: string;
    rating?: number | null;
    comment?: string | null;
  }) => Promise<void>;
}

export default function QuestionResultCard({
  question,
  adaptation,
  feedback,
  onFeedbackSubmit,
}: QuestionResultCardProps) {
  const [rating, setRating] = useState<number | null>(feedback?.rating ?? null);
  const [comment, setComment] = useState(feedback?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopy = async () => {
    const text = formatQuestionForClipboard(
      {
        question_text: adaptation.adapted_statement,
        alternatives: adaptation.adapted_alternatives
          ? Object.fromEntries(
              adaptation.adapted_alternatives.map((alt) => [alt.label, alt.text])
            )
          : null,
      },
      question.correct_answer
    );

    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === null && !comment) return;

    setIsSubmitting(true);
    try {
      await onFeedbackSubmit({
        adaptation_id: adaptation.id,
        rating: rating ?? null,
        comment: comment || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 space-y-6 bg-white">
      {/* Question Number */}
      <div className="text-sm font-medium text-gray-500">
        Question {question.order_number}
      </div>

      {/* Adapted Statement */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {adaptation.adapted_statement}
        </h3>

        {/* Adapted Alternatives (for objective questions) */}
        {adaptation.adapted_alternatives && (
          <div className="space-y-2 mt-4">
            {adaptation.adapted_alternatives.map((alt) => (
              <div
                key={alt.label}
                className="flex items-start gap-3 p-3 rounded bg-gray-50"
              >
                <span className="font-semibold text-gray-600 flex-shrink-0">
                  {alt.label})
                </span>
                <span className="text-gray-700">{alt.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pedagogical Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          BNCC: {adaptation.bncc_skill_code}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {adaptation.bloom_level}
        </Badge>
      </div>

      {/* Copy Button */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="gap-2"
          disabled={isSubmitting}
        >
          <Copy className="w-4 h-4" />
          Copy
        </Button>
        {copyFeedback && (
          <span className="text-sm text-green-600">{copyFeedback}</span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Feedback Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Your Feedback</h4>

        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">How helpful is this?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                disabled={isSubmitting}
                className={`p-2 rounded transition-colors ${
                  rating === star
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                aria-label={`${star} stars`}
                aria-pressed={rating === star}
                tabIndex={0}
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Comment Field */}
        <div className="space-y-2">
          <label htmlFor={`comment-${adaptation.id}`} className="text-sm text-gray-600">
            Comment (optional)
          </label>
          <Textarea
            id={`comment-${adaptation.id}`}
            placeholder="Share your thoughts about this adaptation..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            className="min-h-24"
            maxLength={5000}
            aria-label="Comment text area, maximum 5000 characters"
          />
          <div className="text-xs text-gray-500 text-right">
            {comment.length}/5000
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || (!rating && !comment)}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}
