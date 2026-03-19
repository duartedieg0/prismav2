/**
 * Tests for QuestionInput component
 * Includes rendering, interaction, accessibility, and validation tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QuestionInput } from './question-input';

expect.extend(toHaveNoViolations);

const mockObjectiveQuestion = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  question_text: 'Qual é a capital do Brasil?',
  question_type: 'objective' as const,
  alternatives: {
    a: 'Rio de Janeiro',
    b: 'Brasília',
    c: 'São Paulo',
    d: 'Salvador',
  },
};

const mockEssayQuestion = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  question_text: 'Explique a importância da água para os seres vivos.',
  question_type: 'essay' as const,
  alternatives: null,
};

describe('QuestionInput', () => {
  describe('Objective Questions - Rendering', () => {
    it('should render objective question with radio options', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText('Questão 1')).toBeInTheDocument();
      expect(
        screen.getByText('Qual é a capital do Brasil?')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Alternativa A: Rio de Janeiro/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Alternativa B: Brasília/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Alternativa C: São Paulo/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Alternativa D: Salvador/i })
      ).toBeInTheDocument();
    });

    it('should render all alternatives with correct labels and text', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText(/Rio de Janeiro/)).toBeInTheDocument();
      expect(screen.getByText(/Brasília/)).toBeInTheDocument();
      expect(screen.getByText(/São Paulo/)).toBeInTheDocument();
      expect(screen.getByText(/Salvador/)).toBeInTheDocument();
    });

    it('should display required indicator when isRequired is true', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          isRequired={true}
        />
      );

      const requiredElements = screen.getAllByText('*');
      expect(requiredElements.length).toBeGreaterThan(0);
    });

    it('should not display required indicator when isRequired is false', () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          isRequired={false}
        />
      );

      const requiredSpans = container.querySelectorAll('.text-red-600');
      expect(requiredSpans.length).toBe(0);
    });
  });

  describe('Objective Questions - Interaction', () => {
    it('should call onChange when selecting a radio option', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
        />
      );

      const option = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('should display selected value', async () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value="b"
          onChange={onChange}
        />
      );

      const option = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      expect(option).toHaveAttribute('data-state', 'checked');
    });

    it('should allow changing selected option', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value="a"
          onChange={onChange}
        />
      );

      const optionB = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      await user.click(optionB);

      expect(onChange).toHaveBeenCalledWith('b');

      rerender(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value="b"
          onChange={onChange}
        />
      );

      const optionBAfter = screen.getByRole('radio', {
        name: /Alternativa B: Brasília/i,
      });
      expect(optionBAfter).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Essay Questions - Rendering', () => {
    it('should render essay question with textarea', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText('Questão 2')).toBeInTheDocument();
      expect(
        screen.getByText('Explique a importância da água para os seres vivos.')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Digite sua resposta aqui/i)
      ).toBeInTheDocument();
    });

    it('should render textarea with placeholder text', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
        />
      );

      const textarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      ) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Essay Questions - Interaction', () => {
    it('should call onChange when typing in textarea', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/Digite sua resposta aqui/i);
      await user.type(textarea, 'Test');

      expect(onChange).toHaveBeenCalled();
      // userEvent.type calls onChange for each character
      expect(onChange.mock.calls.length).toBeGreaterThan(0);
    });

    it('should display entered text in textarea', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value="Student response"
          onChange={onChange}
        />
      );

      const textarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Student response');
    });
  });

  describe('Error Handling & Validation', () => {
    it('should display error message when error prop is provided', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          error="Esta questão é obrigatória"
        />
      );

      expect(screen.getByText('Esta questão é obrigatória')).toBeInTheDocument();
    });

    it('should apply error styling to objective question', () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          error="Esta questão é obrigatória"
        />
      );

      const errorDiv = container.querySelector('[role="alert"]');
      expect(errorDiv).toBeInTheDocument();
    });

    it('should apply error styling to essay question', () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
          error="Esta questão é obrigatória"
        />
      );

      const textarea = screen.getByPlaceholderText(
        /Digite sua resposta aqui/i
      ) as HTMLTextAreaElement;
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-describedby when error exists', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
          error="Error message"
        />
      );

      const textarea = screen.getByPlaceholderText(/Digite sua resposta aqui/i);
      expect(textarea).toHaveAttribute('aria-describedby');
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations - objective question', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations - essay question', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations - with error', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          error="Error message"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have properly associated labels for objective question', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
        />
      );

      const labels = screen.getAllByText(/Selecione sua resposta/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have properly associated labels for essay question', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={2}
          value=""
          onChange={onChange}
        />
      );

      const label = screen.getByText(/Sua resposta/i);
      expect(label).toBeInTheDocument();
    });

    it('should have aria-invalid on error for objective question', () => {
      const onChange = vi.fn();
      const { container } = render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={1}
          value=""
          onChange={onChange}
          error="Error"
        />
      );

      const radioGroup = container.querySelector('[role="radiogroup"]');
      expect(radioGroup).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Question Numbering', () => {
    it('should display correct question number', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockObjectiveQuestion}
          questionNumber={5}
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText('Questão 5')).toBeInTheDocument();
    });

    it('should display correct question number for essay', () => {
      const onChange = vi.fn();
      render(
        <QuestionInput
          question={mockEssayQuestion}
          questionNumber={3}
          value=""
          onChange={onChange}
        />
      );

      expect(screen.getByText('Questão 3')).toBeInTheDocument();
    });
  });
});
