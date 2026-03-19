/**
 * A11y and behavior tests for AdaptationProgress component
 * Spec: spec-process-adaptation.md Section 6, Layer 2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdaptationProgress } from './adaptation-progress';

expect.extend(toHaveNoViolations);

describe('AdaptationProgress', () => {
  describe('pending state', () => {
    it('should show waiting message', () => {
      render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={0}
          completedAdaptations={0}
          errorAdaptations={0}
        />
      );
      expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={0}
          completedAdaptations={0}
          errorAdaptations={0}
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('processing state', () => {
    it('should show progress indicator with count', () => {
      render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={6}
          completedAdaptations={3}
          errorAdaptations={0}
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemax', '6');
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="processing"
          totalAdaptations={6}
          completedAdaptations={3}
          errorAdaptations={0}
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('completed state', () => {
    it('should show success message with CTA', () => {
      render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={6}
          errorAdaptations={0}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      expect(screen.getByText(/concluíd/i)).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={6}
          errorAdaptations={0}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('error state', () => {
    it('should show error summary with alert role', () => {
      render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={4}
          errorAdaptations={2}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should have no WCAG violations', async () => {
      const { container } = render(
        <AdaptationProgress
          status="ready"
          totalAdaptations={6}
          completedAdaptations={4}
          errorAdaptations={2}
          examId="550e8400-e29b-41d4-a716-446655440000"
        />
      );
      const results = await axe(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      });
      expect(results).toHaveNoViolations();
    });
  });
});
