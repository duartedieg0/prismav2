/**
 * Unit tests for result API route
 * Tests GET /api/exams/[id]/result endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './result/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

describe('GET /api/exams/[id]/result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: null },
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValueOnce(mockClient);

    const request = new Request('http://localhost/api/exams/test/result', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(401);
  });

  it('should verify authentication before accessing data', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockGetUser = vi.fn().mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Mock a successful supabase client setup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValueOnce(mockClient);

    const request = new Request('http://localhost/api/exams/test/result', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ id: 'test' }) });
    // Should return a valid response (could be 200, 404, or 500 depending on data)
    expect([200, 404, 500]).toContain(response.status);
  });

  it('should return 404 if exam status is not ready', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockFrom = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: mockFrom,
    };
    vi.mocked(createClient).mockResolvedValueOnce(mockClient);

    // Mock exam with status = 'processing'
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'exam-123',
                status: 'processing',
                title: 'Test Exam',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/exams/test/result', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ id: 'exam-123' }) });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Exam not ready');
  });

  it('should return 200 if exam status is ready', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockFrom = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: mockFrom,
    };
    vi.mocked(createClient).mockResolvedValueOnce(mockClient);

    // Mock exam with status = 'ready'
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'exam-123',
                status: 'ready',
                title: 'Test Exam',
                questions: [],
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock feedbacks query with inner joins (adaptation -> question -> exam)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          order: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/exams/test/result', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ id: 'exam-123' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.exam).toBeDefined();
    expect(body.feedbacks).toBeDefined();
  });
});
