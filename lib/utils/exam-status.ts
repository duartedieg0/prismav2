/**
 * Utility functions for exam status management
 * Corresponds to spec-process-extraction.md Section 3.1 - Polling for long-running operations
 */

import type { ExamStatus } from '@/lib/types/extraction';

/**
 * Status display information with progress tracking
 */
export interface ExamStatusInfo {
  /** Current exam status */
  status: ExamStatus;
  /** Human-readable label for the status */
  label: string;
  /** Progress percentage (0-100) for UI progress bars */
  progressPercent: number;
}

/**
 * UI variant for status badge styling
 * Maps to shadcn Badge component variants
 */
export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Converts exam data to status information with progress tracking
 *
 * Status progression and progress mapping:
 * - draft (0%) → initial state, no processing
 * - uploading (25%) → PDF file being uploaded
 * - processing (50%) → PDF being analyzed and questions extracted
 * - awaiting_answers (75%) → extraction complete, awaiting teacher feedback
 * - ready (100%) → fully processed, ready for adaptation
 * - error (0%) → failed, no progress
 *
 * @param exam - Exam object with status field
 * @returns ExamStatusInfo with status, label, and progress percentage
 *
 * @example
 * const exam = { status: 'processing' };
 * const info = getExamStatus(exam);
 * // { status: 'processing', label: 'Processando...', progressPercent: 50 }
 */
export function getExamStatus(exam: {
  status: ExamStatus;
}): ExamStatusInfo {
  const statusMap: Record<ExamStatus, { label: string; progressPercent: number }> = {
    draft: {
      label: 'Rascunho',
      progressPercent: 0,
    },
    uploading: {
      label: 'Enviando PDF...',
      progressPercent: 25,
    },
    processing: {
      label: 'Processando...',
      progressPercent: 50,
    },
    awaiting_answers: {
      label: 'Aguardando respostas...',
      progressPercent: 75,
    },
    ready: {
      label: 'Pronto',
      progressPercent: 100,
    },
    error: {
      label: 'Erro',
      progressPercent: 0,
    },
  };

  const statusInfo = statusMap[exam.status];

  return {
    status: exam.status,
    label: statusInfo.label,
    progressPercent: statusInfo.progressPercent,
  };
}

/**
 * Returns the appropriate UI variant for a status badge
 *
 * Variant mapping:
 * - draft → 'outline' (neutral, unstarted)
 * - uploading/processing/awaiting_answers → 'secondary' (in-progress)
 * - ready → 'default' (success)
 * - error → 'destructive' (failed)
 *
 * @param status - Exam status string
 * @returns shadcn Badge variant for styling
 *
 * @example
 * const variant = getStatusBadgeVariant('processing');
 * // 'secondary'
 */
export function getStatusBadgeVariant(status: ExamStatus): StatusBadgeVariant {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'uploading':
    case 'processing':
    case 'awaiting_answers':
      return 'secondary';
    case 'ready':
      return 'default';
    case 'error':
      return 'destructive';
    default:
      const _exhaustive: never = status;
      return _exhaustive;
  }
}

/**
 * Checks if an exam status represents a terminal state
 * Terminal states: ready, error
 * Non-terminal states require polling: draft, uploading, processing, awaiting_answers
 *
 * @param status - Exam status to check
 * @returns true if status is terminal (no polling needed)
 */
export function isTerminalStatus(status: ExamStatus): boolean {
  return status === 'ready' || status === 'error';
}

/**
 * Checks if an exam status represents an active processing state
 * Active states: uploading, processing, awaiting_answers
 * Inactive states: draft, ready, error
 *
 * @param status - Exam status to check
 * @returns true if status is currently active
 */
export function isActiveStatus(status: ExamStatus): boolean {
  return status === 'uploading' || status === 'processing' || status === 'awaiting_answers';
}
