/**
 * Processing Progress Client Component
 * Handles real-time polling of exam status and auto-redirect on completion
 *
 * Features:
 * - Polls exam status every 2 seconds
 * - Displays real-time adaptation progress (X/Y questions)
 * - Shows loading skeleton while polling
 * - Displays error state with retry button
 * - Auto-redirects to /exams/{id}/result when status becomes 'ready'
 * - Full accessibility support with aria labels
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdaptationProgress } from '@/components/adaptation-progress';
import { useExamStatusPoller } from '@/hooks/use-exam-status-poller';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ProcessingProgressClientProps {
  examId: string;
}

/**
 * Skeleton component for loading state
 */
function ProgressSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Loader2
          className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ProcessingProgressClient({ examId }: ProcessingProgressClientProps) {
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const { status, isPolling, error, adaptationProgress } = useExamStatusPoller(examId, {
    interval: 2000,
    maxRetries: 3,
  });

  /**
   * Handle auto-redirect when exam reaches 'ready' status
   */
  useEffect(() => {
    if (status === 'ready' && !hasRedirected) {
      // Small delay to show success message
      const timer = setTimeout(() => {
        setHasRedirected(true);
        router.push(`/exams/${examId}/result`);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [status, examId, hasRedirected, router]);

  // Initial loading state - waiting for first poll result
  if (status === null && isPolling) {
    return <ProgressSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex gap-3">
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Erro ao processar adaptações
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            aria-label="Tentar novamente"
          >
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/exams/new')}
            aria-label="Voltar para provas"
          >
            Voltar para provas
          </Button>
        </div>
      </div>
    );
  }

  // Processing in progress - only show relevant statuses
  if (status === 'processing' || status === 'ready') {
    return (
      <AdaptationProgress
        status={status}
        totalAdaptations={adaptationProgress?.totalCount ?? 0}
        completedAdaptations={adaptationProgress?.completedCount ?? 0}
        errorAdaptations={0}
        examId={examId}
      />
    );
  }

  // Fallback - should not reach here in normal flow
  return null;
}
