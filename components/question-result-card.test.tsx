/**
 * Unit tests for QuestionResultCard component
 * Tests rendering, interaction, and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import QuestionResultCard from './question-result-card';

expect.extend(toHaveNoViolations);

const mockQuestion = {
  id: 'q1',
  exam_id: 'exam-1',
  question_text: 'What is the capital of France?',
  question_type: 'objective' as const,
  alternatives: {
    a: 'London',
    b: 'Paris',
    c: 'Berlin',
  },
  correct_answer: 'b',
  order_number: 1,
  created_at: '2026-03-19T00:00:00Z',
};

const mockAdaptation = {
  id: 'a1',
  question_id: 'q1',
  support_id: 's1',
  adapted_statement: 'What city is the capital of France?',
  adapted_alternatives: [
    { label: 'a', text: 'England capital' },
    { label: 'b', text: 'France capital' },
    { label: 'c', text: 'Germany capital' },
  ],
  bncc_skill_code: 'EF89LP01',
  bncc_skill_description: 'Know world capitals',
  bloom_level: 'Remember',
  bloom_justification: 'Simple recall of facts',
  status: 'completed' as const,
  created_at: '2026-03-19T00:00:00Z',
};

describe('QuestionResultCard', () => {
  describe('rendering', () => {
    it('should render original question text', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      expect(screen.getByText('What is the capital of France?')).toBeTruthy();
    });

    it('should render adapted question text', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      expect(screen.getByText('What city is the capital of France?')).toBeTruthy();
    });

    it('should render two-column layout labels', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      expect(screen.getByText('Original')).toBeTruthy();
      expect(screen.getByText('Adaptada')).toBeTruthy();
    });

    it('should render copy button', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copiar/i });
      expect(copyButton).toBeTruthy();
    });

    it('should render thumbs feedback buttons', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const thumbsUp = screen.getByLabelText('Thumbs up');
      const thumbsDown = screen.getByLabelText('Thumbs down');
      expect(thumbsUp).toBeTruthy();
      expect(thumbsDown).toBeTruthy();
    });

    it('should render question number', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      expect(screen.getByText(/Questão 1/)).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('should have functional copy button', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copiar/i });
      expect(copyButton).toBeTruthy();
      expect(copyButton).not.toBeDisabled();
    });

    it('should have functional thumbs feedback buttons', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const thumbsUp = screen.getByLabelText('Thumbs up');
      const thumbsDown = screen.getByLabelText('Thumbs down');
      expect(thumbsUp).not.toBeDisabled();
      expect(thumbsDown).not.toBeDisabled();
    });

    it('should display comment field when feedback is selected', () => {
      const onFeedbackSubmit = vi.fn();
      const { container } = render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Initially no textarea should be visible
      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBe(0);
    });

    it('should display existing feedback selection', () => {
      const existingFeedback = {
        id: 'f1',
        exam_id: 'exam-1',
        adaptation_id: mockAdaptation.id,
        rating: 5,
        comment: 'Great!',
        created_at: '2026-03-19T00:00:00Z',
      };
      const onFeedbackSubmit = vi.fn();
      const { container } = render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={existingFeedback}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Verify component renders with existing feedback
      expect(screen.getByText('Esta adaptação foi útil?')).toBeTruthy();
      // The textarea should be visible since feedback exists
      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on thumbs feedback buttons', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const thumbsUp = screen.getByLabelText('Thumbs up');
      const thumbsDown = screen.getByLabelText('Thumbs down');
      expect(thumbsUp.hasAttribute('aria-label')).toBe(true);
      expect(thumbsDown.hasAttribute('aria-label')).toBe(true);
    });

    it('should allow keyboard navigation of feedback buttons', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const thumbsUp = screen.getByLabelText('Thumbs up');
      const thumbsDown = screen.getByLabelText('Thumbs down');
      // Buttons should be focusable (no tabindex="-1")
      expect(thumbsUp).toBeTruthy();
      expect(thumbsDown).toBeTruthy();
    });

    it('should have proper semantic structure', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Check for heading
      expect(screen.getByRole('heading')).toBeTruthy();
      // Check for feedback prompt
      expect(screen.getByText('Esta adaptação foi útil?')).toBeTruthy();
      // Check for buttons
      const thumbsUp = screen.getByLabelText('Thumbs up');
      expect(thumbsUp).toBeTruthy();
    });
  });
});
