/**
 * QuestionInput Component
 * Renders a single question with input field based on question type
 * - Objective: RadioGroup with alternatives
 * - Essay: Textarea for free-form answer
 *
 * Used by ExtractionForm for each question in the extraction page
 */

'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio';
import { Card } from '@/components/ui/card';

interface Question {
  id: string;
  question_text: string;
  question_type: 'objective' | 'essay';
  alternatives?: Record<string, string> | null;
}

interface QuestionInputProps {
  question: Question;
  questionNumber: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isRequired?: boolean;
}

export function QuestionInput({
  question,
  questionNumber,
  value,
  onChange,
  error,
  isRequired = true,
}: QuestionInputProps) {
  const isObjective = question.question_type === 'objective';
  const hasError = !!error;

  return (
    <Card className="p-6 space-y-4">
      {/* Question Statement */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Questão {questionNumber}
        </h2>
        <p className="mt-2 text-base text-foreground leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Input Field - Objective or Essay */}
      {isObjective ? (
        <div className="space-y-3">
          <Label
            htmlFor={`question-${question.id}`}
            className={`block text-sm font-medium ${
              hasError ? 'text-red-600' : 'text-foreground'
            }`}
          >
            Selecione sua resposta {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <RadioGroup
            value={value}
            onValueChange={onChange}
            id={`question-${question.id}`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `error-${question.id}` : undefined}
          >
            <div className="space-y-2">
              {question.alternatives &&
                Object.entries(question.alternatives).map(([key, text]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem
                      value={key}
                      id={`alternative-${question.id}-${key}`}
                      aria-label={`Alternativa ${key.toUpperCase()}: ${text}`}
                    />
                    <Label
                      htmlFor={`alternative-${question.id}-${key}`}
                      className="flex-1 cursor-pointer text-sm leading-relaxed"
                    >
                      <span className="font-medium text-foreground">
                        {key.toUpperCase()}.
                      </span>{' '}
                      <span className="text-foreground">{text}</span>
                    </Label>
                  </div>
                ))}
            </div>
          </RadioGroup>
        </div>
      ) : (
        <div className="space-y-3">
          <Label
            htmlFor={`question-${question.id}`}
            className={`block text-sm font-medium ${
              hasError ? 'text-red-600' : 'text-foreground'
            }`}
          >
            Sua resposta {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <Textarea
            id={`question-${question.id}`}
            placeholder="Digite sua resposta aqui..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`min-h-32 resize-none ${
              hasError
                ? 'border-red-500 ring-red-500/20'
                : 'border-input'
            }`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `error-${question.id}` : undefined}
          />
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div
          id={`error-${question.id}`}
          className="mt-2 text-sm text-red-600 flex items-center gap-2"
          role="alert"
        >
          <span className="font-medium">⚠</span>
          {error}
        </div>
      )}
    </Card>
  );
}
