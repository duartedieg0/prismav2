/**
 * Unit tests for copyable block utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, formatQuestionForClipboard } from './copyable-block';

describe('copyable-block utilities', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard successfully', async () => {
      const text = 'Sample text to copy';
      const result = await copyToClipboard(text);
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });

    it('should handle clipboard write errors gracefully', async () => {
      const mockError = new Error('Clipboard not available');
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(mockError);

      const result = await copyToClipboard('text');
      expect(result).toBe(false);
    });

    it('should handle missing clipboard API', async () => {
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      const result = await copyToClipboard('text');
      expect(result).toBe(false);

      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
      });
    });
  });

  describe('formatQuestionForClipboard', () => {
    it('should format objective question with alternatives', () => {
      const result = formatQuestionForClipboard({
        question_text: 'What is 2 + 2?',
        alternatives: {
          a: '3',
          b: '4',
          c: '5',
        },
      });

      expect(result).toContain('What is 2 + 2?');
      expect(result).toContain('a) 3');
      expect(result).toContain('b) 4');
      expect(result).toContain('c) 5');
    });

    it('should add ✓ marker to correct alternative', () => {
      const result = formatQuestionForClipboard(
        {
          question_text: 'What is 2 + 2?',
          alternatives: {
            a: '3',
            b: '4',
            c: '5',
          },
        },
        'b'
      );

      expect(result).toContain('b) 4 ✓');
      expect(result).not.toContain('a) 3 ✓');
      expect(result).not.toContain('c) 5 ✓');
    });

    it('should handle uppercase correct answer letter', () => {
      const result = formatQuestionForClipboard(
        {
          question_text: 'Question text',
          alternatives: {
            a: 'Option A',
            b: 'Option B',
          },
        },
        'B'
      );

      expect(result).toContain('b) Option B ✓');
      expect(result).not.toContain('a) Option A ✓');
    });

    it('should handle correct answer with ) character', () => {
      const result = formatQuestionForClipboard(
        {
          question_text: 'Question text',
          alternatives: {
            a: 'First',
            b: 'Second',
          },
        },
        'b)'
      );

      expect(result).toContain('b) Second ✓');
    });

    it('should format essay question without alternatives', () => {
      const result = formatQuestionForClipboard({
        question_text: 'Explain photosynthesis.',
        alternatives: null,
      });

      expect(result).toBe('Explain photosynthesis.');
    });

    it('should handle empty alternatives gracefully', () => {
      const result = formatQuestionForClipboard({
        question_text: 'Question text',
        alternatives: {},
      });

      expect(result).toBe('Question text');
    });

    it('should preserve order of alternatives', () => {
      const result = formatQuestionForClipboard({
        question_text: 'Which is largest?',
        alternatives: {
          a: 'Apple',
          b: 'Banana',
          c: 'Watermelon',
        },
      });

      const aIndex = result.indexOf('a)');
      const bIndex = result.indexOf('b)');
      const cIndex = result.indexOf('c)');

      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
    });
  });
});
