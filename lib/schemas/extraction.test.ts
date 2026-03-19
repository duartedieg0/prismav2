/**
 * Unit tests for extraction schemas
 * Validates all Zod schemas with valid and invalid inputs
 */

import { describe, it, expect } from 'vitest';
import {
  createExamSchema,
  extractedQuestionSchema,
  extractionResultSchema,
  examStatusUpdateSchema,
  updateQuestionAnswerSchema,
} from './extraction';

describe('Extraction Schemas', () => {
  describe('createExamSchema', () => {
    it('should validate a valid exam creation request', () => {
      const validData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        topic: 'Algebra Basics',
        supportIds: [],
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with optional topic and supportIds', () => {
      const validData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supportIds).toEqual([]);
      }
    });

    it('should reject invalid subject ID (not UUID)', () => {
      const invalidData = {
        subjectId: 'not-a-uuid',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid grade level ID (not UUID)', () => {
      const invalidData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: 'invalid-uuid',
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-PDF files', () => {
      const invalidData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        pdf: new File(['content'], 'test.txt', { type: 'text/plain' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PDFs larger than 25 MB', () => {
      const largeBuffer = new ArrayBuffer(26 * 1024 * 1024);
      const invalidData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        pdf: new File([largeBuffer], 'large.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject topic longer than 500 characters', () => {
      const invalidData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        topic: 'a'.repeat(501),
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid support IDs (not UUIDs)', () => {
      const invalidData = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        gradeLevelId: '550e8400-e29b-41d4-a716-446655440001',
        supportIds: ['not-a-uuid'],
        pdf: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      };

      const result = createExamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('extractedQuestionSchema', () => {
    it('should validate a valid objective question', () => {
      const validData = {
        question_text: 'What is 2 + 2?',
        question_type: 'objective',
        alternatives: {
          a: '3',
          b: '4',
          c: '5',
        },
      };

      const result = extractedQuestionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate a valid essay question', () => {
      const validData = {
        question_text: 'Explain the theory of evolution in your own words.',
        question_type: 'essay',
        alternatives: null,
      };

      const result = extractedQuestionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty question text', () => {
      const invalidData = {
        question_text: '',
        question_type: 'objective',
        alternatives: { a: 'Option A' },
      };

      const result = extractedQuestionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject question text shorter than 5 characters', () => {
      const invalidData = {
        question_text: 'Hi?',
        question_type: 'objective',
        alternatives: { a: 'Option A' },
      };

      const result = extractedQuestionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid question type', () => {
      const invalidData = {
        question_text: 'What is the capital of France?',
        question_type: 'multiple',
        alternatives: { a: 'Paris' },
      };

      const result = extractedQuestionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject objective questions with less than 2 alternatives', () => {
      const invalidData = {
        question_text: 'What is 2 + 2?',
        question_type: 'objective',
        alternatives: {
          a: '4',
        },
      };

      const result = extractedQuestionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow null alternatives (essay questions)', () => {
      const validData = {
        question_text: 'Write an essay about climate change.',
        question_type: 'essay',
        alternatives: null,
      };

      const result = extractedQuestionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should default alternatives to null if not provided', () => {
      const data = {
        question_text: 'An essay question',
        question_type: 'essay',
      };

      const result = extractedQuestionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alternatives).toBeNull();
      }
    });
  });

  describe('extractionResultSchema', () => {
    it('should validate a successful extraction result', () => {
      const validData = {
        success: true,
        questions: [
          {
            question_text: 'What is photosynthesis?',
            question_type: 'essay',
            alternatives: null,
          },
          {
            question_text: 'Which organelle produces energy?',
            question_type: 'objective',
            alternatives: {
              a: 'Mitochondria',
              b: 'Chloroplast',
              c: 'Nucleus',
            },
          },
        ],
        warnings: ['Page 2 OCR confidence < 80%'],
      };

      const result = extractionResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate a failed extraction result', () => {
      const validData = {
        success: false,
        questions: [],
        error: 'PDF file is corrupted',
      };

      const result = extractionResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should default questions to empty array', () => {
      const data = {
        success: false,
        error: 'Processing failed',
      };

      const result = extractionResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questions).toEqual([]);
      }
    });

    it('should reject missing success flag', () => {
      const invalidData = {
        questions: [],
      };

      const result = extractionResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid question in questions array', () => {
      const invalidData = {
        success: true,
        questions: [
          {
            question_text: '', // Invalid: empty
            question_type: 'objective',
            alternatives: { a: 'Option' },
          },
        ],
      };

      const result = extractionResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('examStatusUpdateSchema', () => {
    it('should validate all valid exam statuses', () => {
      const statuses = ['draft', 'uploading', 'processing', 'awaiting_answers', 'ready', 'error'];

      statuses.forEach((status) => {
        const data = { status };
        const result = examStatusUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const invalidData = { status: 'completed' };
      const result = examStatusUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional extraction_warning and error_message', () => {
      const validData = {
        status: 'ready',
        extraction_warning: 'Pages 3-4 had low OCR confidence',
        error_message: null,
      };

      const result = examStatusUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateQuestionAnswerSchema', () => {
    it('should validate a question answer update', () => {
      const validData = {
        correct_answer: 'a',
      };

      const result = updateQuestionAnswerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow null correct_answer', () => {
      const validData = {
        correct_answer: null,
      };

      const result = updateQuestionAnswerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty correct_answer string', () => {
      const invalidData = {
        correct_answer: '',
      };

      const result = updateQuestionAnswerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow omitting correct_answer', () => {
      const validData = {};
      const result = updateQuestionAnswerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
