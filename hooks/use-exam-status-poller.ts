/**
 * React hook for polling exam status during long-running extraction/adaptation operations
 * Client component hook with automatic cleanup and exponential backoff
 *
 * Corresponds to spec-process-extraction.md Section 3.1 - Polling for long-running operations
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExamStatus } from '@/lib/types/extraction';

/**
 * Adaptation progress information from the API response
 */
export interface AdaptationProgress {
  /** Number of questions successfully adapted */
  completedCount: number;
  /** Total number of questions to adapt */
  totalCount: number;
  /** Current adaptation progress percentage (0-100) */
  progressPercent: number;
}

/**
 * Hook return value for exam status polling
 */
export interface UseExamStatusPollerReturn {
  /** Current exam status (from last API response or initial null, or 'timeout') */
  status: ExamStatus | 'timeout' | null;
  /** True while polling is active (status is not terminal) */
  isPolling: boolean;
  /** Error message if polling failed, null if successful */
  error: string | null;
  /** Adaptation progress tracking (if available in API response) */
  adaptationProgress: AdaptationProgress | null;
}

/**
 * Configuration options for the polling hook
 */
export interface UseExamStatusPollerOptions {
  /** Polling interval in milliseconds (default: 7000ms, spec requires 5-10s) */
  interval?: number;
  /** Maximum number of retries on API failures (default: 3) */
  maxRetries?: number;
  /** Timeout in milliseconds for maximum polling duration (default: 1800000ms / 30 minutes) */
  timeoutMs?: number;
}

/**
 * Response structure from GET /api/exams/[id]/status
 */
interface StatusResponse {
  id: string;
  status: ExamStatus;
  errorMessage?: string;
  adaptationProgress?: {
    completedCount: number;
    totalCount: number;
    progressPercent: number;
  };
}

/**
 * Hook for polling exam status until terminal state (ready or error)
 *
 * Behavior:
 * - Starts polling immediately on mount
 * - Fetches status every 7 seconds (configurable, spec requires 5-10s) via GET /api/exams/[id]/status
 * - Stops polling when status becomes 'ready', 'error', or after 30 minutes timeout (terminal states)
 * - Implements exponential backoff on API failures with max retries
 * - Automatically cleans up interval on unmount or when polling stops
 * - No memory leaks — all timers and state cleared on unmount
 * - 30-minute timeout with "timeout" status if processing exceeds maximum duration
 *
 * Error handling:
 * - Network errors: retries up to maxRetries times with exponential backoff
 * - 401 Unauthorized: stops polling immediately and returns error
 * - 404 Not found: stops polling immediately and returns error
 * - 5xx Server errors: retries with backoff
 * - After max retries exhausted: sets error and stops polling
 *
 * @param examId - UUID of the exam to poll
 * @param options - Configuration options (interval, maxRetries)
 * @returns Object with status, isPolling, error, and adaptationProgress
 *
 * @example
 * const { status, isPolling, error, adaptationProgress } = useExamStatusPoller(examId, {
 *   interval: 2000,
 *   maxRetries: 3
 * });
 *
 * if (error) return <div>Error: {error}</div>;
 * if (isPolling) return <div>Loading... {adaptationProgress?.progressPercent}%</div>;
 * if (status === 'ready') return <div>Exam ready!</div>;
 */
export function useExamStatusPoller(
  examId: string,
  options?: UseExamStatusPollerOptions
): UseExamStatusPollerReturn {
  const { interval = 7000, maxRetries = 3, timeoutMs = 1800000 } = options || {};

  const [status, setStatus] = useState<ExamStatus | 'timeout' | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptationProgress, setAdaptationProgress] = useState<AdaptationProgress | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const startTimeRef = useRef<number | null>(null);

  /**
   * Fetches current exam status from API with retry logic and timeout checking
   */
  const fetchStatus = useCallback(async () => {
    // Check for timeout (30 minutes = 1800000ms)
    if (startTimeRef.current !== null) {
      const elapsedTime = Date.now() - startTimeRef.current;
      if (elapsedTime > timeoutMs) {
        if (isMountedRef.current) {
          setStatus('timeout');
          setIsPolling(false);
          setError('Este processo está demorando mais que o esperado. Por favor, contate o suporte.');
        }
        return;
      }
    }

    try {
      const response = await fetch(`/api/exams/${examId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!isMountedRef.current) return;

      // Non-retryable errors
      if (response.status === 401 || response.status === 404) {
        setError(`Request failed (${response.status})`);
        setIsPolling(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Parse response and extract status
      const data: StatusResponse = await response.json();

      if (!isMountedRef.current) return;

      setStatus(data.status);

      // Update adaptation progress if available
      if (data.adaptationProgress) {
        setAdaptationProgress(data.adaptationProgress);
      }

      // Reset retry counter on success
      retryCountRef.current = 0;
      setError(null);

      // Check if we've reached a terminal state
      if (data.status === 'ready' || data.status === 'error') {
        setIsPolling(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Unknown error';

      // Retry with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, retryCountRef.current - 1) * 1000;
        console.warn(
          `Polling retry ${retryCountRef.current}/${maxRetries} after ${backoffDelay}ms`,
          message
        );

        // Clear existing interval and set new one with backoff
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchStatus();
          }
        }, backoffDelay);
      } else {
        // Max retries exceeded
        setError(`Polling failed after ${maxRetries} retries: ${message}`);
        setIsPolling(false);
      }
    }
  }, [examId, maxRetries, timeoutMs]);

  /**
   * Sets up polling interval with timeout tracking
   */
  useEffect(() => {
    isMountedRef.current = true;
    setIsPolling(true);
    retryCountRef.current = 0;
    startTimeRef.current = Date.now();

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchStatus();
      }
    }, interval);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [examId, interval, fetchStatus]);

  return {
    status,
    isPolling,
    error,
    adaptationProgress,
  };
}
