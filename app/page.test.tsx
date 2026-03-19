/**
 * Landing Page Tests
 * Tests for public landing page, features, and redirect behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('HomePage - Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero section with main headline', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(screen.getByText(/Crie provas/)).toBeInTheDocument();
    expect(screen.getByText(/acessíveis e inclusivas/)).toBeInTheDocument();
  });

  it('renders hero section tagline', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(
      screen.getByText(
        /Adapte suas provas escolares com inteligência artificial/
      )
    ).toBeInTheDocument();
  });

  it('renders navigation with login link', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    const loginLinks = screen.getAllByRole('link', { name: /Entrar/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders CTA buttons', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(screen.getByRole('link', { name: /Começar Agora/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Saiba Mais/i })).toBeInTheDocument();
  });

  it('renders features section with all features', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(screen.getByText('Recursos Poderosos')).toBeInTheDocument();
    expect(screen.getByText('Adaptação com IA')).toBeInTheDocument();
    expect(screen.getByText('Análise de Desempenho')).toBeInTheDocument();
    expect(screen.getByText('Inclusão Educacional')).toBeInTheDocument();
    expect(screen.getByText('Processamento Rápido')).toBeInTheDocument();
    expect(screen.getByText('Suportes Educacionais')).toBeInTheDocument();
  });

  it('renders feature descriptions', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(
      screen.getByText(/Utilize inteligência artificial para adaptar/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Processe e adapte provas em minutos/i)).toBeInTheDocument();
  });

  it('renders call-to-action section', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(screen.getByText('Pronto para começar?')).toBeInTheDocument();
    expect(
      screen.getByText(/Crie sua conta agora e comece a adaptar/i)
    ).toBeInTheDocument();
  });

  it('renders footer with branding', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    expect(screen.getByText('Adapte Minha Prova')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Adapte/)).toBeInTheDocument();
  });

  it('renders all login buttons with correct href', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    render(await HomePage());
    const loginLinks = screen.getAllByRole('link').filter((link) =>
      (link.getAttribute('href') || '').startsWith('/login')
    );
    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBe('/login');
    });
  });

  it('redirects authenticated users to dashboard', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { redirect } = await import('next/navigation');

    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
    });

    await HomePage();
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('has responsive layout elements', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().resolvedValue({ data: { user: null } }),
      },
    });

    const { container } = render(await HomePage());
    // Check for responsive grid classes
    const gridElements = container.querySelectorAll('[class*="grid-cols"]');
    expect(gridElements.length).toBeGreaterThan(0);
  });
});
