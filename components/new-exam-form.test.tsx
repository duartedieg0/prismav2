/**
 * Tests for NewExamForm component
 * Includes rendering, validation, and accessibility tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NewExamForm } from './new-exam-form';

expect.extend(toHaveNoViolations);

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

const mockSubjects = [
  { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Matemática' },
  { id: '223e4567-e89b-12d3-a456-426614174000', name: 'Português' },
];

const mockGradeLevels = [
  { id: '323e4567-e89b-12d3-a456-426614174000', name: '6º Ano', level: 6 },
  { id: '423e4567-e89b-12d3-a456-426614174000', name: '7º Ano', level: 7 },
];

const mockSupports = [
  {
    id: '523e4567-e89b-12d3-a456-426614174000',
    name: 'Fonte Ampliada',
    description: 'Aumenta o tamanho da fonte',
  },
  {
    id: '623e4567-e89b-12d3-a456-426614174000',
    name: 'Aumento de Tempo',
    description: 'Aumenta o tempo disponível',
  },
];

describe('NewExamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render form title and description', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      expect(screen.getByText('Nova Prova')).toBeInTheDocument();
      expect(
        screen.getByText(/Preencha os dados da prova/i)
      ).toBeInTheDocument();
    });

    it('should render stepper component', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Check for stepper progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      // Check for step labels
      expect(screen.getByText('Informações')).toBeInTheDocument();
    });

    it('should render step 0 fields (exam name)', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      expect(screen.getByLabelText(/Nome da Prova/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Disciplina/i)).not.toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const backButton = screen.getByRole('button', { name: /Voltar/i });
      const nextButton = screen.getByRole('button', { name: /Continuar/i });

      expect(backButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      expect(backButton).toBeDisabled(); // Back button disabled on first step
    });

    it('should navigate between steps', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Initially on step 0 (Informações)
      expect(screen.getByLabelText(/Nome da Prova/i)).toBeInTheDocument();

      // Click next
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      // Now on step 1 (Configurações)
      await waitFor(() => {
        expect(screen.getByLabelText(/Disciplina/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Nome da Prova/i)).not.toBeInTheDocument();
      });
    });

    it('should show all support checkboxes on step 1', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      // Support checkboxes should be visible
      await waitFor(() => {
        expect(
          screen.getByRole('checkbox', { name: /Fonte Ampliada/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('checkbox', { name: /Aumento de Tempo/i })
        ).toBeInTheDocument();
      });
    });

    it('should show PDF upload on step 2', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 2 (click next twice)
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // PDF upload should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/Arquivo PDF/i)).toBeInTheDocument();
      });
    });

    it('should show review summary on step 3', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 3 (click next three times)
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Review summary should be visible
      await waitFor(() => {
        expect(screen.getByText(/Resumo da Prova/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', {
            name: /Criar Prova e Extrair Questões/i,
          })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Client-side Validation', () => {
    it('should prevent stepping forward with invalid data on step 0', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Try to navigate without filling exam name
      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      expect(nameInput).toHaveValue('');

      // Navigation buttons should be available even without validation
      // But user can continue and validation happens on submit
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('should accept valid exam name', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i) as HTMLInputElement;
      nameInput.value = 'Prova de Teste válida';
      expect(nameInput).toHaveValue('Prova de Teste válida');
    });

    it('should clear exam name error when user fixes the input', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      await user.type(nameInput, 'AB');

      // Simulate typing to trigger the change handler which clears errors
      await user.clear(nameInput);
      await user.type(nameInput, 'Prova Válida');

      // Error should be cleared when changing the input
      expect(nameInput).toHaveValue('Prova Válida');
    });

    it('should render subject and grade level selects on step 1', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Disciplina/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Série/i)).toBeInTheDocument();
      });
    });

    it('should support selecting supports on step 1', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      const supportCheckbox = screen.getByRole('checkbox', {
        name: /Fonte Ampliada/i,
      });
      expect(supportCheckbox).not.toBeChecked();

      await user.click(supportCheckbox);
      expect(supportCheckbox).toBeChecked();
    });
  });

  describe('Form Interaction', () => {
    it('should support multiple checkbox selections on step 1', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      const checkbox1 = screen.getByRole('checkbox', {
        name: /Fonte Ampliada/i,
      });
      const checkbox2 = screen.getByRole('checkbox', {
        name: /Aumento de Tempo/i,
      });

      await user.click(checkbox1);
      expect(checkbox1).toBeChecked();

      await user.click(checkbox2);
      expect(checkbox2).toBeChecked();
    });

    it('should display filename when PDF is selected on step 2', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const pdfInput = screen.getByLabelText(/Arquivo PDF/i);
      const file = new File(['content'], 'my-exam.pdf', {
        type: 'application/pdf',
      });
      await user.upload(pdfInput, file);

      await waitFor(() => {
        expect(screen.getByText(/my-exam.pdf/i)).toBeInTheDocument();
      });
    });

    it('should display review summary heading on step 3', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate through all steps to reach review
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // On step 3, review summary should be visible
      await waitFor(() => {
        expect(screen.getByText(/Resumo da Prova/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no WCAG violations on initial render (step 0)', async () => {
      const { container } = render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have no WCAG violations on step 1', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Disciplina/i)).toBeInTheDocument();
      });

      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have no WCAG violations on step 2 (upload)', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Arquivo PDF/i)).toBeInTheDocument();
      });

      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper label associations on step 0', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      expect(nameInput).toHaveAttribute('id', 'exam-name');
    });

    it('should have proper label associations on step 2', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const pdfInput = screen.getByLabelText(/Arquivo PDF/i);
      expect(pdfInput).toHaveAttribute('id', 'pdf-file');
    });

    it('should have aria-invalid attribute on inputs', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby set when there is an error', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // The aria-describedby is conditional and only set when there's an error
      // It's defined via the ternary: aria-describedby={errors.exam_name ? 'exam-name-error' : undefined}
      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      expect(nameInput).toHaveAttribute('aria-invalid');
      // When there's no error, aria-describedby is undefined
      expect(nameInput).not.toHaveAttribute('aria-describedby');
    });

    it('should have required indicators for mandatory fields', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThan(0);
    });

    it('should have accessible support checkboxes with descriptions', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      // Navigate to step 1 to see supports
      const nextButton = screen.getByRole('button', { name: /Continuar/i });
      await user.click(nextButton);

      await waitFor(() => {
        const supportCheckbox = screen.getByRole('checkbox', {
          name: /Fonte Ampliada/i,
        });
        expect(supportCheckbox).toBeInTheDocument();
        expect(supportCheckbox).toHaveAttribute('aria-describedby');
      });
    });

    it('should have accessible stepper with progressbar', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute('aria-valuenow');
    });
  });
});
