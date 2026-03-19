/**
 * Zod validation schemas for feedback collection process
 * Corresponds to spec-process-feedback.md (Section 4.3)
 */

import { z } from 'zod';

/**
 * UUIDs must be valid v4 format
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for saving teacher feedback on adapted question
 * Validates:
 * - Required adaptation_id (UUID format)
 * - Optional rating (0-5, integer)
 * - Optional comment (max 1000 chars)
 * - At least one of rating or comment must be provided
 */
export const saveFeedbackSchema = z
  .object({
    adaptation_id: uuidSchema,
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(0, 'Rating must be ≥ 0')
      .max(5, 'Rating must be ≤ 5')
      .nullable()
      .optional(),
    comment: z
      .string()
      .min(1, 'Comment must not be empty')
      .max(1000, 'Comment must be ≤ 1000 characters')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const hasRating = data.rating !== null && data.rating !== undefined;
      const hasComment = data.comment !== null && data.comment !== undefined;
      return hasRating || hasComment;
    },
    {
      message: 'Either rating or comment (or both) must be provided',
      path: ['rating'],
    }
  );

export type SaveFeedbackInput = z.infer<typeof saveFeedbackSchema>;
