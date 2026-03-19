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

    it('should render all form fields', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      expect(screen.getByLabelText(/Nome da Prova/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Disciplina/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Série/i)).toBeInTheDocument();
      expect(screen.getByText(/Suportes Educacionais/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Arquivo PDF/i)).toBeInTheDocument();
    });

    it('should render all support checkboxes', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      expect(
        screen.getByRole('checkbox', { name: /Fonte Ampliada/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /Aumento de Tempo/i })
      ).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      expect(
        screen.getByRole('button', {
          name: /Criar Prova e Extrair Questões/i,
        })
      ).toBeInTheDocument();
    });
  });

  describe('Client-side Validation', () => {
    it('should show error for empty exam name', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Nome deve ter/i)).toBeInTheDocument();
      });
    });

    it('should show error for exam name too short', async () => {
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

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/3 caracteres/i)).toBeInTheDocument();
      });
    });

    it('should show error when no supports selected', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      await user.type(nameInput, 'Prova de Teste');

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/pelo menos um/i)).toBeInTheDocument();
      });
    });

    it('should show error when no PDF file selected', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      await user.type(nameInput, 'Prova de Teste');

      const supportCheckbox = screen.getByRole('checkbox', {
        name: /Fonte Ampliada/i,
      });
      await user.click(supportCheckbox);

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Selecione um arquivo PDF/i)).toBeInTheDocument();
      });
    });

    it('should clear error when user fixes field', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);

      // Submit without value to show error
      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Nome deve ter/i)).toBeInTheDocument();
      });

      // Type valid value
      await user.type(nameInput, 'Prova de Teste');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Nome deve ter/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should support multiple checkbox selections', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

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

    it('should display filename when PDF is selected', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const pdfInput = screen.getByLabelText(/Arquivo PDF/i);
      const file = new File(['content'], 'my-exam.pdf', {
        type: 'application/pdf',
      });
      await user.upload(pdfInput, file);

      await waitFor(() => {
        expect(screen.getByText(/my-exam.pdf/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no WCAG violations on initial render', async () => {
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

    it('should have no WCAG violations with validation errors', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Nome deve ter/i)).toBeInTheDocument();
      });

      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper label associations', () => {
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      expect(nameInput).toHaveAttribute('id', 'exam-name');

      const pdfInput = screen.getByLabelText(/Arquivo PDF/i);
      expect(pdfInput).toHaveAttribute('id', 'pdf-file');
    });

    it('should have aria-invalid on error fields', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Nome da Prova/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have aria-describedby linking errors to inputs', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Nome da Prova/i);
        expect(nameInput).toHaveAttribute(
          'aria-describedby',
          'exam-name-error'
        );
      });
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

    it('should announce error messages with role=alert', async () => {
      const user = userEvent.setup();
      render(
        <NewExamForm
          subjects={mockSubjects}
          gradeLevels={mockGradeLevels}
          supports={mockSupports}
        />
      );

      const nameInput = screen.getByLabelText(/Nome da Prova/i);
      await user.type(nameInput, 'Prova');

      const submitButton = screen.getByRole('button', {
        name: /Criar Prova/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });
});
