/**
 * Processing Progress Client Component
 * Handles real-time polling of exam status and auto-redirect on completion
 *
 * Features:
 * - Polls exam status every 7 seconds (5-10s per spec)
 * - Displays real-time adaptation progress with animated Brain icon
 * - Shows percentage display and expressive progress bar
 * - Shows loading skeleton while polling
 * - Displays error state with retry button and support contact option
 * - Auto-redirects to /exams/{id}/result when status becomes 'ready'
 * - Handles 30-minute timeout with error message
 * - Full accessibility support with aria labels
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStatusPoller } from '@/hooks/use-exam-status-poller';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Brain } from 'lucide-react';

interface ProcessingProgressClientProps {
  examId: string;
}

/**
 * Delay before redirecting to result page on successful completion (ms)
 */
const REDIRECT_DELAY_MS = 1500;

/**
 * Skeleton component for loading state
 */
function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Loader2
          className="h-12 w-12 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-3">
        <div className="h-10 w-24 mx-auto animate-pulse rounded bg-muted" />
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-3/4 mx-auto animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProcessingProgressClient({ examId }: ProcessingProgressClientProps) {
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const { status, isPolling, error, adaptationProgress } = useExamStatusPoller(examId, {
    interval: 7000,
    maxRetries: 3,
    timeoutMs: 1800000,
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
      }, REDIRECT_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [status, examId, hasRedirected, router]);

  // Initial loading state - waiting for first poll result
  if (status === null && isPolling) {
    return <ProgressSkeleton />;
  }

  // Timeout state
  if (status === 'timeout') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-surface-container-low p-4 text-center">
          <AlertCircle
            className="h-8 w-8 text-destructive mx-auto mb-3"
            aria-hidden="true"
          />
          <h3 className="font-semibold text-body text-foreground mb-2">
            Processo demorando muito
          </h3>
          <p className="text-small text-muted-foreground">
            Este processo está demorando mais que o esperado. Por favor, contate o suporte.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.location.href = 'mailto:support@adapteminhaprova.com'}
            aria-label="Enviar email para suporte"
            className="w-full"
          >
            Enviar Email para Suporte
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/exams/new')}
            aria-label="Voltar para provas"
            className="w-full"
          >
            Voltar para provas
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-surface-container-low p-4 text-center">
          <AlertCircle
            className="h-8 w-8 text-destructive mx-auto mb-3"
            aria-hidden="true"
          />
          <h3 className="font-semibold text-body text-foreground mb-2">
            Erro ao processar adaptações
          </h3>
          <p className="text-small text-muted-foreground">{error}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.location.reload()}
            aria-label="Tentar novamente"
            className="w-full"
          >
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/exams/new')}
            aria-label="Voltar para provas"
            className="w-full"
          >
            Voltar para provas
          </Button>
        </div>
      </div>
    );
  }

  // Processing in progress - only show relevant statuses
  if (status === 'processing' || status === 'ready') {
    const totalAdaptations = adaptationProgress?.totalCount ?? 0;
    const completedAdaptations = adaptationProgress?.completedCount ?? 0;
    const progress = totalAdaptations > 0
      ? Math.round((completedAdaptations / totalAdaptations) * 100)
      : 0;

    return (
      <div className="space-y-6">
        {/* Brain Icon with pulse animation */}
        <div className="flex justify-center motion-safe:animate-pulse">
          <Brain className="w-16 h-16 text-primary" aria-hidden="true" />
        </div>

        {/* Percentage Display */}
        <div className="text-display-md font-display text-primary text-center">
          {progress}%
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da adaptação"
          className="w-full h-2 rounded-full bg-surface-container overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Message */}
        <p className="text-body text-muted-foreground text-center">
          {status === 'ready' ? 'Prova pronta!' : 'Processando adaptações...'}
        </p>
      </div>
    );
  }

  // Unknown status fallback - show error message to prevent blank screen
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-surface-container-low p-4 text-center">
        <AlertCircle
          className="h-8 w-8 text-destructive mx-auto mb-3"
          aria-hidden="true"
        />
        <h3 className="font-semibold text-body text-foreground mb-2">
          Status desconhecido
        </h3>
        <p className="text-small text-muted-foreground">
          Status desconhecido. Por favor, atualize a página.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => window.location.reload()}
          aria-label="Atualizar página"
          className="w-full"
        >
          Atualizar página
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/exams/new')}
          aria-label="Voltar para provas"
          className="w-full"
        >
          Voltar para provas
        </Button>
      </div>
    </div>
  );
}
