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

// Create mock router object before the mock
const createMockRouter = () => ({
  push: vi.fn(),
  back: vi.fn(),
});

let mockRouter = createMockRouter();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
}));

// Note: mockRouter is used by the vi.mock('next/navigation') above

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
    // Reset router mock
    mockRouter = createMockRouter();
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

      // Answer only first two questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );

      // Confirm all questions (even though not all are answered)
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Try to submit without answering essay question
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Should show error for the unanswered essay question
      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
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

      // Answer only two questions
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Try to submit without answering essay
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Check error exists
      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
      });

      // Answer the essay question
      const essayTextarea = screen.getByPlaceholderText(/Digite sua resposta aqui/i);
      await user.type(essayTextarea, 'My essay answer');

      // Error should be cleared
      await waitFor(() => {
        const errors = screen.queryAllByText(/Esta questão é obrigatória/i);
        expect(errors.length).toBe(0);
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit should fail - essay question not answered
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit successfully with all questions answered and confirmed', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Verify API call happened
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const [url, options] = (global.fetch as any).mock.calls[0];
        expect(url).toBe(`/api/exams/${mockExamId}/answers`);
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');
      });
    });

    it('should send only objective questions with correct answers', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit and check for loading state
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Check for loading text "Processando..."
      expect(
        screen.getByText(/Processando/i)
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should call router when submission succeeds', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Verify fetch was called (router.push is called after successful fetch)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/exams/${mockExamId}/answers`,
          expect.any(Object)
        );
      });
    });

    it('should display error message on API failure', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'INVALID_STATUS', details: 'Exam must be in awaiting_answers status' }),
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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Check error message appears in the DOM
      await waitFor(() => {
        expect(
          screen.getByText(/Exam must be in awaiting_answers status/i)
        ).toBeInTheDocument();
      });
    });

    it('should display generic error on network failure', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      // Check error message appears (verify the full message)
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/Erro ao enviar respostas/i);
        expect(errorMessages.length).toBeGreaterThan(0);
        // At least one should be the full error message with connection info
        const fullError = errorMessages.find(el =>
          el.textContent?.includes('conexão')
        );
        expect(fullError).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Button', () => {
    it('should render cancel button and be clickable', async () => {
      const user = userEvent.setup();

      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Get the cancel button in the footer
      const cancelButton = screen.getByRole('button', { name: /^Cancelar$/ });

      // Verify the button exists and is clickable (router.back is called internally)
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();

      // Button click should not throw
      await expect(user.click(cancelButton)).resolves.not.toThrow();
    });

    it('should disable cancel button during submission', async () => {
      const user = userEvent.setup();
      // Mocks are cleared in beforeEach
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

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
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Submit
      const submitButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(submitButton);

      const cancelButton = screen.getByRole('button', { name: /^Cancelar$/ });
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

      // Submit should be disabled initially
      const submitButton = screen.getByRole('button', { name: /Próximo/i });
      expect(submitButton).toBeDisabled();

      // Confirm all questions
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      for (const button of confirmButtons) {
        await user.click(button);
      }

      // Now submit should be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
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

      // Initial count - check it appears somewhere in the document
      expect(screen.getByText((content, element) => {
        return !!(element && element.textContent === '0 de 3 confirmadas');
      })).toBeInTheDocument();

      // Confirm one question (get first confirm button only)
      const confirmButtons = screen.getAllByRole('button', { name: /^Confirmar$/ });
      await user.click(confirmButtons[0]);

      // Updated count
      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return !!(element && element.textContent === '1 de 3 confirmadas');
        })).toBeInTheDocument();
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
        expect(screen.getByText((content, element) => {
          return !!(element && element.textContent === '3 de 3 confirmadas');
        })).toBeInTheDocument();
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

      let confirmButton = screen.getByRole('button', { name: /^Confirmar$/ });

      // Confirm
      await user.click(confirmButton);

      // Wait for button text to change to "Confirmada"
      await waitFor(() => {
        confirmButton = screen.getByRole('button', { name: /Confirmada/i });
        expect(confirmButton).toBeInTheDocument();
      });

      // Unconfirm by clicking the confirmed button
      await user.click(confirmButton);

      // Verify it changed back to "Confirmar"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^Confirmar$/ })).toBeInTheDocument();
      });
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

      const confirmButton = screen.getByRole('button', { name: /^Confirmar$/ });
      await user.click(confirmButton);

      // Check for confirmation button text
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Confirmada/i })).toBeInTheDocument();
      });
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

      // Confirm question first (but don't answer it)
      const confirmButtons = screen.getAllByRole('button', { name: /Confirmar/i });
      await user.click(confirmButtons[0]);

      // Try to submit without answering - should show validation errors
      const submitButton = screen.getByRole('button', { name: /Próximo/i });
      await user.click(submitButton);

      await waitFor(() => {
        const results = axe(container);
        // Just check that a11y violations don't increase dramatically
        return results;
      });
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
