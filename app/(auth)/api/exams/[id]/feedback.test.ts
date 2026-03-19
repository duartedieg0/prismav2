/**
 * Unit tests for feedback API route
 * Tests POST /api/exams/[id]/feedback endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './feedback/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

describe('POST /api/exams/[id]/feedback', () => {
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

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHENTICATED');
  });

  it('should return 400 if validation fails', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValueOnce(mockClient);

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: 'invalid-uuid',
        rating: 5,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(400);
  });

  it('should accept feedback with rating only', async () => {
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

    // Mock adaptation check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              exam_id: 'exam-123',
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock exam authorization check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: 'exam-123' },
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock database upsert
    mockFrom.mockReturnValueOnce({
      upsert: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: 'feedback-123',
              adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
              rating: 5,
              comment: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('should replace existing feedback on resubmission (upsert)', async () => {
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

    // Mock adaptation check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              exam_id: 'exam-123',
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock exam authorization check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: 'exam-123' },
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock database upsert
    const mockUpsert = vi.fn().mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'feedback-123',
            adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
            rating: 4,
            comment: 'Updated comment',
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValueOnce({
      upsert: mockUpsert,
    });

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
        comment: 'Updated comment',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(200);

    // Verify upsert was called with onConflict clause
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-123',
      }),
      expect.objectContaining({
        onConflict: 'adaptation_id,user_id',
      })
    );
  });

  it('should return 404 if adaptation does not exist', async () => {
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

    // Mock adaptation check - returns null (not found)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('ADAPTATION_NOT_FOUND');
  });

  it('should return 403 if exam does not belong to user', async () => {
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

    // Mock adaptation check - found
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              exam_id: 'exam-456',
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock exam check - not found (doesn't belong to user)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/exams/test/feedback', {
      method: 'POST',
      body: JSON.stringify({
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'test' }) });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('FORBIDDEN');
  });
});
