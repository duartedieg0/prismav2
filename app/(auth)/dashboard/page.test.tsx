/**
 * Dashboard Page Tests
 * Tests for rendering user exams, status badges, and navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  redirect: vi.fn(),
}));

const mockExams = [
  {
    id: '1',
    title: 'Prova de Matemática',
    status: 'draft' as const,
    created_at: '2026-03-19T10:00:00Z',
    updated_at: '2026-03-19T10:00:00Z',
  },
  {
    id: '2',
    title: 'Prova de Português',
    status: 'processing' as const,
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-18T15:00:00Z',
  },
  {
    id: '3',
    title: 'Prova de História',
    status: 'ready' as const,
    created_at: '2026-03-17T10:00:00Z',
    updated_at: '2026-03-17T20:00:00Z',
  },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());
    expect(screen.getByText('Minhas Provas')).toBeInTheDocument();
    expect(
      screen.getByText('Gerencie e adapte suas provas escolares com IA')
    ).toBeInTheDocument();
  });

  it('renders create new exam button', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());
    const createButton = screen.getByRole('link', { name: /Nova Prova/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveAttribute('href', '/exams/new');
  });

  it('renders empty state when no exams exist', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());
    expect(screen.getByText('Nenhuma prova ainda')).toBeInTheDocument();
    expect(
      screen.getByText('Crie sua primeira prova para começar a adaptar com IA')
    ).toBeInTheDocument();
  });

  it('renders list of exams with correct status badges', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: mockExams,
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());

    // Check exam titles are displayed
    expect(screen.getByText('Prova de Matemática')).toBeInTheDocument();
    expect(screen.getByText('Prova de Português')).toBeInTheDocument();
    expect(screen.getByText('Prova de História')).toBeInTheDocument();

    // Check status badges are displayed
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Processando...')).toBeInTheDocument();
    expect(screen.getByText('Pronto')).toBeInTheDocument();
  });

  it('renders correct links for different exam statuses', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: mockExams,
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());

    // Check links point to correct pages based on status
    const examLinks = screen.getAllByRole('link').filter((link) =>
      ['/exams/1/extraction', '/exams/2/processing', '/exams/3/result'].includes(
        link.getAttribute('href') || ''
      )
    );

    expect(examLinks).toHaveLength(3);
  });

  it('renders formatted date in exam cards', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: mockExams.slice(0, 1), // Just first exam
              error: null,
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());
    expect(screen.getByText(/Atualizado em/)).toBeInTheDocument();
  });

  it('handles database errors gracefully', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().resolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    });

    render(await DashboardPage());
    // Should show empty state when database error occurs
    expect(screen.getByText('Nenhuma prova ainda')).toBeInTheDocument();
  });
});
