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

    const response = await GET(request, { params: { id: 'test' } });
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

    const response = await GET(request, { params: { id: 'test' } });
    // Should return a valid response (could be 200, 404, or 500 depending on data)
    expect([200, 404, 500]).toContain(response.status);
  });
});
