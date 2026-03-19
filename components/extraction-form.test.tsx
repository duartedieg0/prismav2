/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for ExtractionForm component
 * Includes rendering, form validation, submission, and accessibility tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ExtractionForm } from './extraction-form';

expect.extend(toHaveNoViolations);

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

const mockQuestions = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    question_text: 'Qual é a capital do Brasil?',
    question_type: 'objective' as const,
    alternatives: {
      a: 'Rio de Janeiro',
      b: 'Brasília',
      c: 'São Paulo',
      d: 'Salvador',
    },
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    question_text: 'Qual é a população do Brasil?',
    question_type: 'objective' as const,
    alternatives: {
      a: '100 milhões',
      b: '150 milhões',
      c: '200 milhões',
      d: '250 milhões',
    },
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174002',
    question_text: 'Explique a importância da educação.',
    question_type: 'essay' as const,
    alternatives: null,
  },
];

const mockExamId = '123e4567-e89b-12d3-a456-426614174999';
const mockExamName = 'Prova de Geografia';

describe('ExtractionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with exam name and question count', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(screen.getByText(mockExamName)).toBeInTheDocument();
      expect(
        screen.getByText(/Responda todas as/i)
      ).toBeInTheDocument();
    });

    it('should render all questions', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(
        screen.getByText('Qual é a capital do Brasil?')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Qual é a população do Brasil?')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Explique a importância da educação.')
      ).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(
        screen.getByRole('button', { name: /Enviar Respostas/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Cancelar/i })
      ).toBeInTheDocument();
    });

    it('should render empty state when no questions', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[]}
        />
      );

      expect(
        screen.getByText(/Nenhuma questão foi extraída do PDF/i)
      ).toBeInTheDocument();
    });

    it('should display question count in singular form', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      expect(
        screen.getByText(/Responda todas as 1 questão abaixo/)
      ).toBeInTheDocument();
    });

    it('should display question count in plural form', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Verify plural form
      expect(
        screen.getByText(/Responda todas as 3 questões abaixo/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when submitting without answering all questions', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Should show multiple error messages
      const errorMessages = await screen.findAllByText(
        /Esta questão é obrigatória/i
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should clear error when user provides answer', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Try to submit without answers
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Check error exists
      let errorMessages = await screen.findAllByText(
        /Esta questão é obrigatória/i
      );
      expect(errorMessages.length).toBeGreaterThan(0);

      // Select an answer for first question
      const radioButton = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      await user.click(radioButton);

      // Error should be cleared for that question
      errorMessages = screen.queryAllByText(/Esta questão é obrigatória/i);
      expect(errorMessages.length).toBeLessThan(3);
    });

    it('should validate all required questions before submission', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer first two questions (objective)
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );

      // Submit should fail - essay question not answered
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      const errorMessages = await screen.findAllByText(
        /Esta questão é obrigatória/i
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Form Submission', () => {
    it('should submit successfully with all questions answered', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const { useRouter } = await import('next/navigation');
      const mockPush = vi.fn();
      (useRouter as any).mockReturnValue({
        push: mockPush,
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Educação é importante para o desenvolvimento');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/exams/${mockExamId}/answers`,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });
    });

    it('should send only objective questions with correct answers', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const { useRouter } = await import('next/navigation');
      const mockPush = vi.fn();
      (useRouter as any).mockReturnValue({
        push: mockPush,
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa C: 200 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Verify payload includes only objective questions
      await waitFor(() => {
        const fetchCall = (global.fetch as any).mock.calls[0];
        const payload = JSON.parse(fetchCall[1].body);
        expect(payload.answers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              questionId: '123e4567-e89b-12d3-a456-426614174000',
              correctAnswer: 'b',
            }),
            expect.objectContaining({
              questionId: '223e4567-e89b-12d3-a456-426614174001',
              correctAnswer: 'c',
            }),
          ])
        );
        expect(payload.answers.length).toBe(2);
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      const { useRouter } = await import('next/navigation');
      (useRouter as any).mockReturnValue({
        push: vi.fn(),
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit and check for loading state
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      expect(
        screen.getByRole('button', { name: /Enviando respostas/i })
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should redirect to processing page on success', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const { useRouter } = await import('next/navigation');
      const mockPush = vi.fn();
      (useRouter as any).mockReturnValue({
        push: mockPush,
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/exams/${mockExamId}/processing`);
      });
    });

    it('should display error message on API failure', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'INVALID_STATUS', details: 'Exam must be in awaiting_answers status' }),
      });

      const { useRouter } = await import('next/navigation');
      (useRouter as any).mockReturnValue({
        push: vi.fn(),
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Check error message
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(
        screen.getByText(/Exam must be in awaiting_answers status/i)
      ).toBeInTheDocument();
    });

    it('should display generic error on network failure', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { useRouter } = await import('next/navigation');
      (useRouter as any).mockReturnValue({
        push: vi.fn(),
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      // Check error message
      await waitFor(() => {
        expect(
          screen.getByText(
            /Erro ao enviar respostas. Por favor, verifique sua conexão/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Button', () => {
    it('should call router.back when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const { useRouter } = await import('next/navigation');
      const mockBack = vi.fn();
      (useRouter as any).mockReturnValue({
        push: vi.fn(),
        back: mockBack,
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      await user.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should disable cancel button during submission', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      const { useRouter } = await import('next/navigation');
      (useRouter as any).mockReturnValue({
        push: vi.fn(),
        back: vi.fn(),
      });

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer all questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with error message', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Enviar Respostas/i,
      });
      await user.click(submitButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(screen.getByRole('button', { name: /Enviar Respostas/i })).toBeInTheDocument();
    });
  });
});
