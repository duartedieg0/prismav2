/**
 * Tests for Processing Page (Server Component)
 *
 * Covers:
 * - Exam ownership verification
 * - Status validation (must be 'processing')
 * - Redirects for unauthorized access
 * - Server-side data fetching
 * - Error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import ProcessingPage from './page';

// Mock Next.js redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock child component
vi.mock('./processing-progress-client', () => ({
  ProcessingProgressClient: ({ examId }: { examId: string }) => (
    <div data-testid="processing-progress-client">Client: {examId}</div>
  ),
}));

// Mock UI components
interface MockCardProps {
  children: React.ReactNode;
  className?: string;
}

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: MockCardProps) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

import { createClient } from '@/lib/supabase/server';

describe('ProcessingPage (Server Component)', () => {
  const examId = 'test-exam-id-456';
  const userId = 'test-user-id-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Render', () => {
    it('should fetch exam with correct parameters', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: examId,
          name: 'Math Exam',
          status: 'processing',
          user_id: userId,
        },
        error: null,
      });

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }));

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: mockFrom,
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );

      await ProcessingPage({
        params: Promise.resolve({ id: examId }),
      });

      expect(mockFrom).toHaveBeenCalledWith('exams');
      expect(mockSelect).toHaveBeenCalledWith('id, name, status, user_id');
      expect(mockEq).toHaveBeenCalledWith('id', examId);
    });

    it('should authenticate user before querying', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
      });

      const mockSupabaseClient = {
        auth: {
          getUser: mockGetUser,
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'processing',
              user_id: userId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );

      await ProcessingPage({
        params: Promise.resolve({ id: examId }),
      });

      expect(mockGetUser).toHaveBeenCalled();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should redirect when user not authenticated', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith('/exams/new');
      }
    });

    it('should redirect when exam not found', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: 'NOT FOUND',
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith('/exams/new');
      }
    });

    it('should redirect when user does not own exam', async () => {
      const otherUserId = 'other-user-id';

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'processing',
              user_id: otherUserId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith('/exams/new');
      }
    });
  });

  describe('Status Validation', () => {
    it('should redirect when status is not processing', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'ready', // Wrong status
              user_id: userId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith(`/exams/${examId}`);
      }
    });

    it('should redirect when status is awaiting_answers', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'awaiting_answers',
              user_id: userId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith(`/exams/${examId}`);
      }
    });

    it('should redirect when status is error', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'error',
              user_id: userId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );
      (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('redirect');
      });

      try {
        await ProcessingPage({
          params: Promise.resolve({ id: examId }),
        });
      } catch {
        expect(redirect).toHaveBeenCalledWith(`/exams/${examId}`);
      }
    });
  });

  describe('Database Queries', () => {
    it('should fetch exam with correct select fields', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: examId,
          name: 'Test Exam',
          status: 'processing',
          user_id: userId,
        },
        error: null,
      });

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }));

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: mockFrom,
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );

      await ProcessingPage({
        params: Promise.resolve({ id: examId }),
      });

      expect(mockFrom).toHaveBeenCalledWith('exams');
      expect(mockSelect).toHaveBeenCalledWith('id, name, status, user_id');
      expect(mockEq).toHaveBeenCalledWith('id', examId);
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should get authenticated user before querying database', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
      });

      const mockSupabaseClient = {
        auth: {
          getUser: mockGetUser,
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: examId,
              name: 'Test Exam',
              status: 'processing',
              user_id: userId,
            },
            error: null,
          }),
        })),
      };

      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseClient as unknown
      );

      await ProcessingPage({
        params: Promise.resolve({ id: examId }),
      });

      expect(mockGetUser).toHaveBeenCalled();
    });
  });

});
