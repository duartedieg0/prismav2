import { describe, it, expect } from 'vitest';
import {
  validateExamName,
  validatePdfFile,
  validateSupports,
  validateSubjectId,
  validateGradeLevelId,
  newExamFormSchema,
} from './form-validation';

describe('Form Validation Utilities', () => {
  describe('validateExamName', () => {
    it('should accept valid exam names', () => {
      const result = validateExamName('Prova de Matemática');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject names shorter than 3 characters', () => {
      const result = validateExamName('AB');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 caracteres');
    });

    it('should reject names longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = validateExamName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100 caracteres');
    });

    it('should accept exactly 3 characters', () => {
      const result = validateExamName('ABC');
      expect(result.valid).toBe(true);
    });

    it('should accept exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const result = validateExamName(name);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePdfFile', () => {
    it('should accept valid PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validatePdfFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-PDF files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validatePdfFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PDF');
    });

    it('should reject files larger than 10 MB', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validatePdfFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10 MB');
    });

    it('should accept files exactly 10 MB', () => {
      const exactContent = new Array(10 * 1024 * 1024).fill('a').join('');
      const file = new File([exactContent], 'exact.pdf', { type: 'application/pdf' });
      const result = validatePdfFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSupports', () => {
    it('should accept at least one support ID', () => {
      const supportIds = ['123e4567-e89b-12d3-a456-426614174000'];
      const result = validateSupports(supportIds);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept multiple support IDs', () => {
      const supportIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '223e4567-e89b-12d3-a456-426614174000',
      ];
      const result = validateSupports(supportIds);
      expect(result.valid).toBe(true);
    });

    it('should reject empty support list', () => {
      const result = validateSupports([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('pelo menos um');
    });

    it('should reject invalid UUID format', () => {
      const supportIds = ['not-a-uuid'];
      const result = validateSupports(supportIds);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSubjectId', () => {
    it('should accept valid UUID', () => {
      const result = validateSubjectId('123e4567-e89b-12d3-a456-426614174000');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid UUID', () => {
      const result = validateSubjectId('invalid-id');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inválido');
    });

    it('should reject empty string', () => {
      const result = validateSubjectId('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateGradeLevelId', () => {
    it('should accept valid UUID', () => {
      const result = validateGradeLevelId('123e4567-e89b-12d3-a456-426614174000');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid UUID', () => {
      const result = validateGradeLevelId('invalid-id');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inválido');
    });
  });

  describe('newExamFormSchema', () => {
    it('should validate complete form data', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const data = {
        exam_name: 'Prova de Matemática',
        subject_id: '123e4567-e89b-12d3-a456-426614174000',
        grade_level_id: '123e4567-e89b-12d3-a456-426614174001',
        supports: ['123e4567-e89b-12d3-a456-426614174002'],
        pdf_file: file,
      };

      const result = newExamFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject incomplete form data', () => {
      const data = {
        exam_name: 'Prova',
        subject_id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing grade_level_id, supports, pdf_file
      };

      const result = newExamFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject form with invalid data', () => {
      const data = {
        exam_name: 'AB', // Too short
        subject_id: 'invalid',
        grade_level_id: 'invalid',
        supports: [],
        pdf_file: new File(['content'], 'test.txt', { type: 'text/plain' }),
      };

      const result = newExamFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
