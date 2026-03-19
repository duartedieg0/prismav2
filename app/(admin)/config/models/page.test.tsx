/**
 * Admin AI Models Page Tests
 * Tests for CRUD operations on AI models
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiModelsPage from './page';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const mockModels = [
  {
    id: '1',
    name: 'GPT-4',
    description: 'Advanced model for complex tasks',
    is_default: true,
    created_at: '2026-03-19T10:00:00Z',
    updated_at: '2026-03-19T10:00:00Z',
  },
  {
    id: '2',
    name: 'Claude 3',
    description: 'Balanced model',
    is_default: false,
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-18T10:00:00Z',
  },
];

describe('AiModelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      }),
    });

    render(await AiModelsPage());
    expect(screen.getByText('Modelos de IA')).toBeInTheDocument();
  });

  it('renders empty state when no models exist', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'admin' },
            }),
          }),
          order: vi.fn().resolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(await AiModelsPage());
    expect(screen.getByText(/Nenhum modelo de IA cadastrado/)).toBeInTheDocument();
  });

  it('displays models table with data', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'admin' },
            }),
          }),
          order: vi.fn().resolvedValue({
            data: mockModels,
            error: null,
          }),
        }),
      }),
    });

    render(await AiModelsPage());
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Claude 3')).toBeInTheDocument();
  });

  it('shows default model indicator', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'admin' },
            }),
          }),
          order: vi.fn().resolvedValue({
            data: mockModels,
            error: null,
          }),
        }),
      }),
    });

    render(await AiModelsPage());
    expect(screen.getByText('Padrão')).toBeInTheDocument();
  });

  it('displays action buttons', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'admin' },
            }),
          }),
          order: vi.fn().resolvedValue({
            data: mockModels,
            error: null,
          }),
        }),
      }),
    });

    render(await AiModelsPage());
    const editButtons = screen.getAllByRole('button').filter((btn) =>
      btn.className.includes('ghost')
    );
    expect(editButtons.length).toBeGreaterThanOrEqual(4); // 2 models x 2 actions each
  });

  it('redirects non-admin users', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { redirect } = await import('next/navigation');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'regular-user' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().resolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      }),
    });

    await AiModelsPage();
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects unauthenticated users', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { redirect } = await import('next/navigation');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: null },
        }),
      },
    });

    await AiModelsPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
