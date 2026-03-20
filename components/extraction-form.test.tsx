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
        screen.getByText(/Revisar Questões Extraídas/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/0 de 3 confirmadas/i)).toBeInTheDocument();
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
        screen.getByRole('button', { name: /Próximo/i })
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
        screen.getByText(/0 de 1 confirmadas/i)
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

      // Verify plural form counter
      expect(
        screen.getByText(/0 de 3 confirmadas/i)
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

      // First confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Now submit without answering
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Should show multiple error messages - use flexible matcher
      await waitFor(() => {
        const errorText = screen.queryAllByText((content) => {
          return content.includes('Esta questão é obrigatória');
        });
        expect(errorText.length).toBeGreaterThan(0);
      });
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

      // Confirm all questions first
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Try to submit without answers
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Check error exists
      await waitFor(() => {
        const errorText = screen.queryAllByText((content) => {
          return content.includes('Esta questão é obrigatória');
        });
        expect(errorText.length).toBeGreaterThan(0);
      });

      // Select an answer for first question
      const radioButton = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      await user.click(radioButton);

      // Error count should decrease
      await waitFor(() => {
        const errorText = screen.queryAllByText((content) => {
          return content.includes('Esta questão é obrigatória');
        });
        expect(errorText.length).toBeLessThan(3);
      });
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit should fail - essay question not answered
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const errorText = screen.queryAllByText((content) => {
          return content.includes('Esta questão é obrigatória');
        });
        expect(errorText.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit successfully with all questions answered and confirmed', async () => {
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit and check for loading state
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      expect(
        screen.getByRole('button', { name: /Processando/i })
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
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

      // Get all cancel buttons (there might be multiple if multiple questions)
      const cancelButton = screen.getAllByRole('button', { name: /Cancelar/i })[0];
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

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Confirmation Feature', () => {
    it('should disable submit button until all questions are confirmed', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Próximo/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when all questions are confirmed', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      const submitButton = screen.getByRole('button', { name: /Próximo/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should show confirmation counter', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Initial count with flexible matcher
      expect(screen.getByText((content) => content.includes('0 de 3 confirmadas'))).toBeInTheDocument();

      // Confirm one question
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      await user.click(confirmButtons[0]);

      // Updated count
      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('1 de 3 confirmadas'))).toBeInTheDocument();
      });
    });

    it('should allow confirming all at once with "Confirmar todas" button', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      const confirmAllButton = screen.getByRole('button', { name: /Confirmar todas/i });
      await user.click(confirmAllButton);

      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('3 de 3 confirmadas'))).toBeInTheDocument();
        expect(confirmAllButton).toBeDisabled();
      });
    });

    it('should toggle confirmation on individual questions', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Confirmar/i });

      // Confirm
      await user.click(confirmButton);
      expect(screen.getByText('Confirmada')).toBeInTheDocument();

      // Unconfirm
      const confirmedButton = screen.getByRole('button', { name: /Confirmada/i });
      await user.click(confirmedButton);

      // Verify it changed back to "Confirmar"
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument();
    });

    it('should display visual feedback for confirmed questions', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Confirmar/i });
      await user.click(confirmButton);

      // Check for confirmation badge text
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
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

      // Confirm question first
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      await user.click(confirmButtons[0]);

      // Try to submit without answering - should show validation errors
      const submitButtons = screen.getAllByRole('button', { name: /Próximo/i });
      await user.click(submitButtons[0]);

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

      expect(screen.getByRole('button', { name: /Próximo/i })).toBeInTheDocument();
    });
  });
});
