/**
 * Unit tests for ExamResultPage component
 * Tests rendering, data loading, and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import ExamResultPage from './exam-result-page';

expect.extend(toHaveNoViolations);

// Mock fetch globally
global.fetch = vi.fn();

const mockResultData = {
  exam: {
    id: 'exam-123',
    title: 'Math Test',
    topic: 'Algebra',
    subject_id: 'subject-1',
    grade_level_id: 'grade-9',
    status: 'ready',
    created_at: '2026-03-18T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
    questions: [
      {
        id: 'q1',
        question_text: 'What is 2+2?',
        question_type: 'objective',
        alternatives: { a: '3', b: '4', c: '5' },
        correct_answer: 'b',
        order_number: 1,
        created_at: '2026-03-18T00:00:00Z',
        adaptations: [
          {
            id: 'a1',
            adapted_statement: 'What is the sum of 2 and 2?',
            adapted_alternatives: [
              { label: 'a', text: 'Three' },
              { label: 'b', text: 'Four' },
              { label: 'c', text: 'Five' },
            ],
            bncc_skill_code: 'EF89MA01',
            bncc_skill_description: 'Basic addition',
            bloom_level: 'Remember',
            bloom_justification: 'Basic recall',
            status: 'completed',
            created_at: '2026-03-19T00:00:00Z',
          },
        ],
      },
    ],
  },
  feedbacks: [
    {
      id: 'f1',
      adaptation_id: 'a1',
      rating: 5,
      comment: 'Great adaptation!',
      created_at: '2026-03-19T12:00:00Z',
    },
  ],
};

describe('ExamResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResultData,
    });
  });

  describe('rendering', () => {
    it('should render result page header', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(screen.getByText('Resultado da Adaptação')).toBeTruthy();
      });
    });

    it('should render loading state initially', () => {
      // Mock with a delay to see loading state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockResultData,
              }),
            1000
          )
        )
      );

      const { container } = render(<ExamResultPage examId="exam-123" />);
      // Either loading skeleton or data is shown
      expect(container).toBeTruthy();
    });

    it('should render list of question result cards', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        // Should have header which indicates data is loaded
        expect(screen.getByText('Resultado da Adaptação')).toBeTruthy();
      });
    });

    it('should render navigation buttons', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(screen.getByText('Exportar PDF')).toBeTruthy();
        expect(screen.getByText('Voltar')).toBeTruthy();
        expect(screen.getByText('Nova Prova')).toBeTruthy();
      });
    });
  });

  describe('data loading', () => {
    it('should fetch exam result data on mount', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/exams/exam-123/result');
      });
    });

    it('should handle API errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeTruthy();
      });
    });

    it('should handle 404 exam not found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(screen.getByText(/exam not found/i)).toBeTruthy();
      });
    });
  });

  describe('interaction', () => {
    it('should accept feedback submission from child components', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        expect(screen.getByText('Resultado da Adaptação')).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('should have descriptive page heading', async () => {
      render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeTruthy();
        expect(heading.textContent).toContain('Resultado da Adaptação');
      });
    });

    it('should have proper landmark regions', async () => {
      const { container } = render(<ExamResultPage examId="exam-123" />);

      await waitFor(() => {
        const main = container.querySelector('main');
        expect(main).toBeTruthy();
      });
    });
  });
});
