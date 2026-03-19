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

    const response = await POST(request, { params: { id: 'test' } });
    expect(response.status).toBe(401);
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

    const response = await POST(request, { params: { id: 'test' } });
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

    // Mock database insert
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValueOnce({
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

    const response = await POST(request, { params: { id: 'test' } });
    expect(response.status).toBe(201);
  });
});
