/**
 * Unit tests for adaptation utility functions
 * Spec: spec-process-adaptation.md Section 6, Layer 1
 */

import { describe, it, expect } from 'vitest';
import {
  identifyQuestionType,
  validateCorrectAnswer,
  validateAdaptedAlternatives,
  safeParseAlternatives,
  buildAdaptationPrompt,
} from './adaptation';

describe('Adaptation Utilities', () => {
  describe('identifyQuestionType', () => {
    it('should return multiple_choice for question with alternatives', () => {
      const question = { alternatives: { a: 'Option A', b: 'Option B' } };
      expect(identifyQuestionType(question)).toBe('multiple_choice');
    });

    it('should return essay for question with null alternatives', () => {
      const question = { alternatives: null };
      expect(identifyQuestionType(question)).toBe('essay');
    });

    it('should return essay for question with undefined alternatives', () => {
      const question = {};
      expect(identifyQuestionType(question)).toBe('essay');
    });
  });

  describe('validateAdaptedAlternatives', () => {
    it('should return null when counts match', () => {
      expect(validateAdaptedAlternatives(4, 4)).toBeNull();
    });

    it('should return error message on count mismatch', () => {
      const result = validateAdaptedAlternatives(4, 3);
      expect(result).toBe('Expected 4 alternatives, got 3');
    });

    it('should return error when expected is 0', () => {
      const result = validateAdaptedAlternatives(0, 2);
      expect(result).toBe('Expected 0 alternatives, got 2');
    });
  });

  describe('validateCorrectAnswer', () => {
    it('should return null for valid letter (A-E)', () => {
      expect(validateCorrectAnswer('B', 'multiple_choice')).toBeNull();
    });

    it('should return error for empty string', () => {
      expect(validateCorrectAnswer('', 'multiple_choice')).toBeTruthy();
    });

    it('should return error for non-letter string on MC question', () => {
      expect(validateCorrectAnswer('maybe', 'multiple_choice')).toBeTruthy();
    });

    it('should return null for any string on essay question', () => {
      expect(validateCorrectAnswer('full text answer', 'essay')).toBeNull();
    });

    it('should return null for empty string on essay question', () => {
      expect(validateCorrectAnswer('', 'essay')).toBeNull();
    });
  });

  describe('safeParseAlternatives', () => {
    it('should parse valid JSON array of alternatives', () => {
      const raw = JSON.stringify([
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
      ]);
      const result = safeParseAlternatives(raw);
      expect(result).toHaveLength(2);
      expect(result![0].label).toBe('A');
    });

    it('should return null for plain text string', () => {
      expect(safeParseAlternatives('Just a plain text answer')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(safeParseAlternatives(null)).toBeNull();
    });

    it('should return null for non-array JSON', () => {
      expect(safeParseAlternatives('{"text": "not an array"}')).toBeNull();
    });
  });

  describe('buildAdaptationPrompt', () => {
    const mcQuestion = {
      question_text: 'What is 2+2?',
      alternatives: { a: '3', b: '4', c: '5', d: '6' },
      correct_answer: 'b',
    };

    const essayQuestion = {
      question_text: 'Explain photosynthesis.',
      alternatives: null,
      correct_answer: null,
    };

    const support = { name: 'Simplificação de Texto' };
    const bncc = { skillCode: 'EF06MA01', skillDescription: 'Resolver problemas...' };

    it('should include JSON output instruction for MC question', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('adaptedStatement');
      expect(prompt).toContain('adaptedAlternatives');
      expect(prompt).toContain('\\n');
    });

    it('should request plain text output for essay question', () => {
      const prompt = buildAdaptationPrompt(essayQuestion, support, bncc);
      expect(prompt).not.toContain('adaptedAlternatives');
      expect(prompt).toContain('plain text');
    });

    it('should include BNCC skill in prompt', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('EF06MA01');
    });

    it('should include support name in prompt', () => {
      const prompt = buildAdaptationPrompt(mcQuestion, support, bncc);
      expect(prompt).toContain('Simplificação de Texto');
    });
  });
});
