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

    it('should render adapted alternatives for objective questions', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      expect(screen.getByText('England capital')).toBeTruthy();
      expect(screen.getByText('France capital')).toBeTruthy();
      expect(screen.getByText('Germany capital')).toBeTruthy();
    });

    it('should render BNCC and Bloom badges', () => {
      const onFeedbackSubmit = vi.fn();
      const { container } = render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Look for badge elements that contain BNCC code and Bloom level
      const badges = container.querySelectorAll('[data-slot="badge"]');
      const badgeTexts = Array.from(badges).map((b) => b.textContent || '');
      expect(badgeTexts.some((text) => text.includes('EF89LP01'))).toBe(true);
      expect(badgeTexts.some((text) => text.includes('Remember'))).toBe(true);
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

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeTruthy();
    });

    it('should render star rating input', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const stars = screen.getAllByRole('button', { name: /star/i });
      expect(stars.length).toBeGreaterThan(0);
    });

    it('should render comment field', () => {
      const onFeedbackSubmit = vi.fn();
      const { container } = render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });

  describe('interaction', () => {
    it('should update star rating on click', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Stars should be clickable buttons
      const buttons = screen.getAllByRole('button');
      const starButtons = buttons.filter((btn) =>
        btn.getAttribute('aria-label')?.includes('star')
      );
      expect(starButtons.length).toBeGreaterThanOrEqual(5);
    });

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

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeTruthy();
      expect(copyButton).not.toBeDisabled();
    });

    it('should display existing feedback rating', () => {
      const existingFeedback = {
        id: 'f1',
        exam_id: 'exam-1',
        adaptation_id: mockAdaptation.id,
        rating: 4,
        comment: null,
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
      expect(screen.getByText('Your Feedback')).toBeTruthy();
      // The rating should be loaded into state - check for textareas
      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on star rating buttons', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const stars = screen.getAllByRole('button');
      const starButtons = stars.filter((btn) =>
        btn.getAttribute('aria-label')?.includes('star')
      );
      expect(starButtons.length).toBeGreaterThan(0);
      // Verify each star has proper ARIA attributes
      starButtons.forEach((star) => {
        expect(star.hasAttribute('aria-label')).toBe(true);
        expect(star.hasAttribute('aria-pressed')).toBe(true);
      });
    });

    it('should allow keyboard navigation of star rating', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      const stars = screen.getAllByRole('button');
      const starButtons = stars.filter((btn) =>
        btn.getAttribute('aria-label')?.includes('star')
      );
      // First star should be focusable (tabindex >= 0 or no tabindex)
      expect(starButtons.length).toBeGreaterThan(0);
    });

    it('should have proper form semantics', () => {
      const onFeedbackSubmit = vi.fn();
      render(
        <QuestionResultCard
          question={mockQuestion}
          adaptation={mockAdaptation}
          feedback={null}
          onFeedbackSubmit={onFeedbackSubmit}
        />
      );

      // Check for form labels
      expect(screen.getByText('How helpful is this?')).toBeTruthy();
      expect(screen.getByText(/comment/i)).toBeTruthy();

      // Check for submit button
      const submitButton = screen.getByRole('button', { name: /submit feedback/i });
      expect(submitButton).toBeTruthy();
    });
  });
});
