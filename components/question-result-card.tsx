'use client';

/**
 * QuestionResultCard Component
 * Displays adapted question in two-column layout (original | adapted)
 * with copy button and thumbs feedback system
 *
 * Props:
 * - question: Original question data
 * - adaptation: Adapted question with pedagogical analysis
 * - feedback: Existing feedback (if any)
 * - onFeedbackSubmit: Callback when user submits rating/comment
 */

import { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question } from '@/lib/types/extraction';
import type { Adaptation } from '@/lib/types/adaptation';
import type { QuestionFeedback } from '@/lib/types/feedback';

/**
 * CopyButton Subcomponent
 * Copies adapted text to clipboard with feedback
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={copied ? 'text-success' : ''}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" aria-hidden="true" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" aria-hidden="true" />
          Copiar adaptação
        </>
      )}
    </Button>
  );
}

/**
 * ThumbsFeedback Subcomponent
 * Collects feedback with thumbs up/down and optional comment
 */
function ThumbsFeedback({
  onSubmit,
  existingFeedback,
}: {
  onSubmit: (data: { rating: 'up' | 'down' | null; comment: string }) => Promise<void>;
  existingFeedback: QuestionFeedback | null;
}) {
  const [selected, setSelected] = useState<'up' | 'down' | null>(
    existingFeedback?.rating ? (existingFeedback.rating > 2 ? 'up' : 'down') : null
  );
  const [comment, setComment] = useState(existingFeedback?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        rating: selected,
        comment,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body font-medium text-foreground">
        Esta adaptação foi útil?
      </p>
      <div className="flex gap-3">
        <Button
          variant={selected === 'up' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('up')}
          disabled={isSubmitting}
          aria-label="Adaptação útil - polegar para cima"
          className="gap-2"
        >
          <ThumbsUp className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sim</span>
        </Button>
        <Button
          variant={selected === 'down' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('down')}
          disabled={isSubmitting}
          aria-label="Adaptação não útil - polegar para baixo"
          className="gap-2"
        >
          <ThumbsDown className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Não</span>
        </Button>
      </div>
      {selected && (
        <>
          <textarea
            className="rounded-md border border-border bg-card px-3 py-2 text-small placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Deixe um comentário (opcional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            aria-label="Comentário sobre feedback da adaptação"
            maxLength={500}
            rows={3}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
          </Button>
        </>
      )}
    </div>
  );
}

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
  const originalText = question.question_text;
  const adaptedText = adaptation.adapted_statement;

  const handleThumbsFeedback = async (data: {
    rating: 'up' | 'down' | null;
    comment: string;
  }) => {
    const ratingValue = data.rating === 'up' ? 5 : data.rating === 'down' ? 1 : null;
    await onFeedbackSubmit({
      adaptation_id: adaptation.id,
      rating: ratingValue,
      comment: data.comment || null,
    });
  };

  return (
    <div className="rounded-lg bg-surface-container-low overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-small font-medium text-muted-foreground">
          Questão {question.order_number}
        </h3>
        <CopyButton text={adaptedText} />
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-6">
        <div>
          <p className="text-caption uppercase tracking-wide text-muted-foreground mb-4 font-medium">
            Original
          </p>
          <p className="text-body leading-relaxed text-foreground">
            {originalText}
          </p>
        </div>
        <div>
          <p className="text-caption uppercase tracking-wide text-muted-foreground mb-4 font-medium">
            Adaptada
          </p>
          <p className="text-body leading-relaxed text-foreground">
            {adaptedText}
          </p>
        </div>
      </div>

      {/* Feedback */}
      <div className="px-6 py-6 border-t border-border/30">
        <ThumbsFeedback
          onSubmit={handleThumbsFeedback}
          existingFeedback={feedback}
        />
      </div>
    </div>
  );
}
