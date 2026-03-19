'use client';

import { tv } from 'tailwind-variants';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface AdaptationProgressProps {
  status: 'processing' | 'ready' | 'error';
  totalAdaptations: number;
  completedAdaptations: number;
  errorAdaptations: number;
  examId?: string;
}

const containerVariants = tv({
  base: 'rounded-lg border p-6',
  variants: {
    state: {
      pending: 'border-border bg-muted/30',
      processing: 'border-border bg-muted/30',
      completed: 'border-border bg-muted/30',
      error: 'border-destructive/50 bg-destructive/5',
    },
  },
});

export function AdaptationProgress({
  status,
  totalAdaptations,
  completedAdaptations,
  errorAdaptations,
  examId,
}: AdaptationProgressProps) {
  const isPending = status === 'processing' && totalAdaptations === 0;
  const isProcessing = status === 'processing' && totalAdaptations > 0;
  const isCompleted = status === 'ready' && errorAdaptations === 0;
  const hasErrors = status === 'ready' && errorAdaptations > 0;

  if (isPending) {
    return (
      <div className={containerVariants({ state: 'pending' })}>
        <div className="flex items-center gap-3">
          <Loader2
            className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Aguardando início do processamento...
          </p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    const percentage = totalAdaptations > 0
      ? Math.round((completedAdaptations / totalAdaptations) * 100)
      : 0;

    return (
      <div className={containerVariants({ state: 'processing' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2
              className="h-5 w-5 animate-spin text-foreground motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              Processando adaptações... {completedAdaptations} de {totalAdaptations}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completedAdaptations}
            aria-valuemin={0}
            aria-valuemax={totalAdaptations}
            aria-label={`Progresso: ${completedAdaptations} de ${totalAdaptations} adaptações concluídas`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-foreground transition-all duration-200"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className={containerVariants({ state: 'completed' })}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Adaptações concluídas com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
              {completedAdaptations} adaptação{completedAdaptations !== 1 ? 'ões' : 'ão'} gerada{completedAdaptations !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
        {examId && (
          <a
            href={`/exams/${examId}/result`}
            className="mt-4 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            Ver resultados
          </a>
        )}
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className={containerVariants({ state: 'error' })}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Processamento concluído com erros
            </p>
          </div>
          <div role="alert">
            <p className="text-sm text-muted-foreground">
              {completedAdaptations} de {totalAdaptations} adaptações concluídas.{' '}
              {errorAdaptations} adaptação{errorAdaptations !== 1 ? 'ões' : 'ão'} com erro.
            </p>
          </div>
          {examId && (
            <a
              href={`/exams/${examId}/result`}
              className="mt-2 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
            >
              Ver resultados disponíveis
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}
