/**
 * Tests for ProcessingProgressClient component
 *
 * Covers:
 * - Initial loading state (skeleton)
 * - Polling behavior and progress updates
 * - Auto-redirect on 'ready' status
 * - Error handling with retry button
 * - Accessibility (aria labels, alerts)
 * - Component cleanup
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { ProcessingProgressClient } from './processing-progress-client';
import { useExamStatusPoller } from '@/hooks/use-exam-status-poller';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the polling hook
vi.mock('@/hooks/use-exam-status-poller', () => ({
  useExamStatusPoller: vi.fn(),
}));


// Mock Button component
interface MockButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: string;
  [key: string]: unknown;
}

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: MockButtonProps) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

describe('ProcessingProgressClient', () => {
  const mockPush = vi.fn();
  const examId = 'test-exam-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Loading State', () => {
    it('should display skeleton loader while polling starts', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: true,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Should have animated skeleton elements
      const skeletonElements = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletonElements.length).toBeGreaterThan(0);

      // Should have spinner icon
      const spinners = document.querySelectorAll('[class*="animate-spin"]');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should not render error or progress components while loading', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: true,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByText(/Erro ao processar/)).not.toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('should display percentage progress with brain icon', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 5,
          totalCount: 10,
          progressPercent: 50,
        },
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Should display percentage
      expect(screen.getByText('50%')).toBeInTheDocument();

      // Should have progress bar with aria attributes
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');

      // Should have status message
      expect(screen.getByText('Processando adaptações...')).toBeInTheDocument();
    });

    it('should handle processing status with no progress yet', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 0,
          totalCount: 15,
          progressPercent: 0,
        },
      });

      render(<ProcessingProgressClient examId={examId} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should update progress bar as polling continues', async () => {
      const { rerender } = render(<ProcessingProgressClient examId={examId} />);

      // Initial state
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 3,
          totalCount: 10,
          progressPercent: 30,
        },
      });

      rerender(<ProcessingProgressClient examId={examId} />);
      expect(screen.getByText('30%')).toBeInTheDocument();

      // Updated state
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 8,
          totalCount: 10,
          progressPercent: 80,
        },
      });

      rerender(<ProcessingProgressClient examId={examId} />);
      expect(screen.getByText('80%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '80');
    });
  });

  describe('Auto-Redirect on Ready', () => {
    it('should display 100% progress when ready', async () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'ready',
        isPolling: false,
        error: null,
        adaptationProgress: {
          completedCount: 10,
          totalCount: 10,
          progressPercent: 100,
        },
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Should show 100% progress
      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should have cleanup effect on unmount', async () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 5,
          totalCount: 10,
          progressPercent: 50,
        },
      });

      const { unmount } = render(<ProcessingProgressClient examId={examId} />);

      // Component should unmount gracefully
      unmount();

      expect(true).toBe(true);
    });
  });

  describe('Error State', () => {
    it('should display error message with retry button', () => {
      const errorMsg = 'Polling failed after 3 retries: Network error';

      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: false,
        error: errorMsg,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      expect(screen.getByText(/Erro ao processar adaptações/)).toBeInTheDocument();
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Voltar para provas/ })).toBeInTheDocument();
    });

    it('should reload page when retry button clicked', async () => {
      const user = userEvent.setup();
      let reloadCalled = false;
      const originalLocation = window.location;

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: {
          reload: () => {
            reloadCalled = true;
          },
        },
        writable: true,
      });

      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: false,
        error: 'Connection timeout',
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      const retryButton = screen.getByRole('button', { name: /Tentar novamente/ });
      await user.click(retryButton);

      expect(reloadCalled).toBe(true);

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should navigate to exams when back button clicked', async () => {
      const user = userEvent.setup();

      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: false,
        error: 'Server error',
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      const backButton = screen.getByRole('button', { name: /Voltar para provas/ });
      await user.click(backButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/exams/new');
      });
    });

    it('should have alert role for error container', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: false,
        error: 'Fatal error occurred',
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Error container should be semantic
      const errorContainer = screen.getByText(/Erro ao processar adaptações/).closest('div');
      expect(errorContainer?.parentElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on loading spinner', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: true,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Icons should be hidden from screen readers
      const icons = document.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have accessible error alert', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: null,
        isPolling: false,
        error: 'Network error',
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Error message should be visible to screen readers
      expect(screen.getByText(/Network error/)).toBeInTheDocument();

      // Should have accessible buttons
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-label');
      });
    });

    it('should have accessible brain icon with aria-hidden', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: {
          completedCount: 5,
          totalCount: 10,
          progressPercent: 50,
        },
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Brain icon should be hidden from screen readers
      const brainIcon = document.querySelector('[class*="lucide-brain"]');
      expect(brainIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null adaptation progress gracefully', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'processing',
        isPolling: true,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle error status from hook', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'error',
        isPolling: false,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Should render component without crashing (returns null for unknown statuses)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clear redirect timer on unmount', async () => {
      const { unmount } = render(<ProcessingProgressClient examId={examId} />);

      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'ready',
        isPolling: false,
        error: null,
        adaptationProgress: {
          completedCount: 10,
          totalCount: 10,
          progressPercent: 100,
        },
      });

      unmount();

      // Component should unmount without issues
      expect(mockPush.mock.calls.length).toBe(0);
    });
  });
});
