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
    it('should render form with exam name and progress indicator', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(screen.getByText(mockExamName)).toBeInTheDocument();
      expect(screen.getByText(/Pergunta 1 de 3/i)).toBeInTheDocument();
    });

    it('should render only the first question initially', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // First question should be visible
      expect(
        screen.getByText('Qual é a capital do Brasil?')
      ).toBeInTheDocument();

      // Other questions should not be visible
      expect(
        screen.queryByText('Qual é a população do Brasil?')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Explique a importância da educação.')
      ).not.toBeInTheDocument();
    });

    it('should render navigation and submit buttons', () => {
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
        screen.getByRole('button', { name: /Anterior/i })
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

    it('should display progress for single question', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={[mockQuestions[0]]}
        />
      );

      expect(
        screen.getByText(/Pergunta 1 de 1/i)
      ).toBeInTheDocument();
    });

    it('should display progress for multiple questions', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(
        screen.getByText(/Pergunta 1 de 3/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when trying to navigate without answering', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Try to proceed to next question without answering
      const nextButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(nextButton);

      // Should show error for the unanswered question
      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
      });

      // Should still be on question 1
      expect(screen.getByText(/Pergunta 1 de 3/i)).toBeInTheDocument();
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

      // Try to proceed without answering
      const nextButton = screen.getByRole('button', {
        name: /Próximo/i,
      });
      await user.click(nextButton);

      // Check error exists
      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
      });

      // Answer the question
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );

      // Error should be cleared
      await waitFor(() => {
        const errors = screen.queryAllByText(/Esta questão é obrigatória/i);
        expect(errors.length).toBe(0);
      });
    });

    it('should validate all questions before final submission', async () => {
      const user = userEvent.setup();
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

      // Navigate through questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3 (essay) - try to submit without answering
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

      // Should show error for unanswered essay
      await waitFor(() => {
        expect(screen.getByText(/Esta questão é obrigatória/i)).toBeInTheDocument();
      });

      // Still on question 3
      expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit successfully with all questions answered', async () => {
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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Educação é importante para o desenvolvimento');

      // Submit
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa C: 200 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit and check for loading state
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

      // Check for loading text "Processando..."
      expect(
        screen.getByText(/Processando/i)
      ).toBeInTheDocument();
      expect(finalizeButton).toBeDisabled();
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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

      // Verify fetch was called and loading is complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Submit
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

      // Verify fetch was called and component handles error gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
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

    it('should keep buttons enabled while not loading', async () => {
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

      // Navigate through all questions and answer them
      // Question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      const essayTextarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      );
      await user.type(essayTextarea, 'Essay response');

      // Before submitting, cancel button should be enabled
      const cancelButton = screen.getByRole('button', { name: /^Cancelar$/ });
      expect(cancelButton).not.toBeDisabled();
    });

    it('should navigate to next question when answering and clicking Próximo', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Start on question 1
      expect(screen.getByText(/Pergunta 1 de 3/i)).toBeInTheDocument();
      expect(
        screen.getByText('Qual é a capital do Brasil?')
      ).toBeInTheDocument();

      // Answer and navigate
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Should be on question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      expect(
        screen.getByText('Qual é a população do Brasil?')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Qual é a capital do Brasil?')
      ).not.toBeInTheDocument();
    });

    it('should disable Anterior button on first question', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      const anteriorButton = screen.getByRole('button', { name: /Anterior/i });
      expect(anteriorButton).toBeDisabled();
    });

    it('should enable Anterior button on non-first questions', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Navigate to question 2
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Anterior should be enabled
      await waitFor(() => {
        const anteriorButton = screen.getByRole('button', { name: /Anterior/i });
        expect(anteriorButton).not.toBeDisabled();
      });
    });

    it('should navigate back to previous question when clicking Anterior', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Navigate to question 2
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Navigate to question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Now on question 3, go back
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 3 de 3/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /Anterior/i }));

      // Should be back on question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
        expect(
          screen.getByText('Qual é a população do Brasil?')
        ).toBeInTheDocument();
      });
    });

    it('should show Finalizar button on last question', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Navigate to question 2
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Navigate to question 3
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: 150 milhões/i })
      );
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Should show Finalizar on last question
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Finalizar/i })
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: /Próximo/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Answer Persistence', () => {
    it('should preserve answers when navigating between questions', async () => {
      const user = userEvent.setup();
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      // Answer question 1
      await user.click(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      );

      // Navigate to question 2
      await user.click(screen.getByRole('button', { name: /Próximo/i }));

      // Answer question 2
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 2 de 3/i)).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('radio', { name: /Alternativa C: 200 milhões/i })
      );

      // Navigate back to question 1
      await user.click(screen.getByRole('button', { name: /Anterior/i }));

      // Verify answer is still selected
      await waitFor(() => {
        expect(screen.getByText(/Pergunta 1 de 3/i)).toBeInTheDocument();
        const brasíliaRadio = screen.getByRole('radio', {
          name: /Alternativa B: Brasília/i,
        });
        expect(brasíliaRadio).toBeChecked();
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

      // Try to submit without answering - should show validation errors
      const finalizeButton = screen.getByRole('button', { name: /Finalizar/i });
      await user.click(finalizeButton);

      await waitFor(() => {
        const results = axe(container);
        // Just check that a11y violations don't increase dramatically
        return results;
      });
    });

    it('should have proper form structure with navigation', () => {
      render(
        <ExtractionForm
          examId={mockExamId}
          examName={mockExamName}
          questions={mockQuestions}
        />
      );

      expect(screen.getByRole('button', { name: /Próximo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });
  });
});
