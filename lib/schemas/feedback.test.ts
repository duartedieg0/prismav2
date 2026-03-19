/**
 * Unit tests for feedback schemas
 * Validates all Zod schemas with valid and invalid inputs
 */

import { describe, it, expect } from 'vitest';
import { saveFeedbackSchema } from './feedback';

describe('Feedback Schemas', () => {
  describe('saveFeedbackSchema', () => {
    it('should validate feedback with rating only', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate feedback with comment only', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        comment: 'Great adaptation!',
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate feedback with both rating and comment', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
        comment: 'Very helpful for students',
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with rating = 0', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 0,
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with null rating', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: null,
        comment: 'Just a comment',
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with null comment', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 3,
        comment: null,
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject if both rating and comment are null/missing', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid adaptation_id (not UUID)', () => {
      const invalidData = {
        adaptation_id: 'not-a-uuid',
        rating: 5,
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject rating < 0', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: -1,
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject rating > 5', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 6,
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer rating', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        rating: 3.5,
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty comment string', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        comment: '',
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject comment longer than 5000 characters', () => {
      const invalidData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        comment: 'a'.repeat(5001),
      };

      const result = saveFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept comment exactly 5000 characters', () => {
      const validData = {
        adaptation_id: '550e8400-e29b-41d4-a716-446655440000',
        comment: 'a'.repeat(5000),
      };

      const result = saveFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
