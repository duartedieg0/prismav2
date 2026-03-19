/**
 * Admin User Management Page Tests
 * Tests for user listing, filtering, and management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UsersPage from './page';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin' as const,
    blocked: false,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: '2',
    email: 'teacher@example.com',
    full_name: 'Teacher User',
    role: 'teacher' as const,
    blocked: false,
    created_at: '2026-03-02T10:00:00Z',
  },
  {
    id: '3',
    email: 'student@example.com',
    full_name: 'Student User',
    role: 'user' as const,
    blocked: true,
    created_at: '2026-03-03T10:00:00Z',
  },
];

describe('UsersPage', () => {
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
          order: vi.fn().resolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    expect(screen.getByText('Gerenciar Usuários')).toBeInTheDocument();
  });

  it('renders empty state when no users exist', async () => {
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

    render(await UsersPage());
    expect(screen.getByText(/Nenhum usuário encontrado/)).toBeInTheDocument();
  });

  it('displays users table with all users', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Teacher User')).toBeInTheDocument();
    expect(screen.getByText('Student User')).toBeInTheDocument();
  });

  it('displays user emails', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('teacher@example.com')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
  });

  it('displays role badges for each user', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Professor')).toBeInTheDocument();
    expect(screen.getByText('Usuário')).toBeInTheDocument();
  });

  it('displays status badges (active/blocked)', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    const activeBadges = screen.getAllByText('Ativo');
    const blockedBadges = screen.getAllByText('Bloqueado');
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(blockedBadges.length).toBeGreaterThan(0);
  });

  it('displays action buttons for each user', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    const blockButtons = screen.getAllByText(/Bloquear|Desbloquear/);
    const deleteButtons = screen.getAllByText('Deletar');
    expect(blockButtons.length).toBe(mockUsers.length);
    expect(deleteButtons.length).toBe(mockUsers.length);
  });

  it('displays formatted dates', async () => {
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
            data: mockUsers,
            error: null,
          }),
        }),
      }),
    });

    render(await UsersPage());
    expect(screen.getByText(/mar/)).toBeInTheDocument(); // Should show month in PT-BR format
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
              data: { role: 'teacher' },
            }),
          }),
        }),
      }),
    });

    await UsersPage();
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

    await UsersPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
