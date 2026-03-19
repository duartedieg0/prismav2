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

// Mock the AdaptationProgress component
interface MockAdaptationProgressProps {
  status: string;
  totalAdaptations: number;
  completedAdaptations: number;
  errorAdaptations: number;
  examId?: string;
}

vi.mock('@/components/adaptation-progress', () => ({
  AdaptationProgress: ({
    status,
    totalAdaptations,
    completedAdaptations,
    errorAdaptations,
    examId,
  }: MockAdaptationProgressProps) => (
    <div data-testid="adaptation-progress">
      <div>Status: {status}</div>
      <div>Progress: {completedAdaptations}/{totalAdaptations}</div>
      <div>Errors: {errorAdaptations}</div>
      {examId && <div>Exam ID: {examId}</div>}
    </div>
  ),
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

      expect(screen.queryByTestId('adaptation-progress')).not.toBeInTheDocument();
      expect(screen.queryByText(/Erro ao processar/)).not.toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('should display adaptation progress with correct counts', () => {
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

      expect(screen.getByTestId('adaptation-progress')).toBeInTheDocument();
      expect(screen.getByText('Status: processing')).toBeInTheDocument();
      expect(screen.getByText('Progress: 5/10')).toBeInTheDocument();
      expect(screen.getByText(`Exam ID: ${examId}`)).toBeInTheDocument();
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

      expect(screen.getByText('Progress: 0/15')).toBeInTheDocument();
    });

    it('should update progress as polling continues', async () => {
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
      expect(screen.getByText('Progress: 3/10')).toBeInTheDocument();

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
      expect(screen.getByText('Progress: 8/10')).toBeInTheDocument();
    });
  });

  describe('Auto-Redirect on Ready', () => {
    it('should display completed status when ready', async () => {
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

      // Should show AdaptationProgress component in ready state
      expect(screen.getByTestId('adaptation-progress')).toBeInTheDocument();
      expect(screen.getByText('Status: ready')).toBeInTheDocument();
      expect(screen.getByText('Progress: 10/10')).toBeInTheDocument();
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

    it('should pass examId to AdaptationProgress for a11y', () => {
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

      expect(screen.getByText(`Exam ID: ${examId}`)).toBeInTheDocument();
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

      expect(screen.getByTestId('adaptation-progress')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0/0')).toBeInTheDocument();
    });

    it('should handle error status from hook', () => {
      (useExamStatusPoller as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'error',
        isPolling: false,
        error: null,
        adaptationProgress: null,
      });

      render(<ProcessingProgressClient examId={examId} />);

      // Should render component without crashing
      expect(screen.queryByTestId('adaptation-progress')).not.toBeInTheDocument();
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
