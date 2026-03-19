/**
 * Zod validation schemas for PDF extraction process
 * Corresponds to spec-process-extraction.md (Section 3)
 */

import { z } from 'zod';

/**
 * UUIDs must be valid v4 format
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for exam status enum
 */
const examStatusSchema = z.enum(
  ['draft', 'uploading', 'processing', 'awaiting_answers', 'ready', 'error'],
  { message: 'Invalid exam status' }
);

/**
 * Schema for question type enum
 */
const questionTypeSchema = z.enum(['objective', 'essay'], {
  message: 'Question type must be "objective" or "essay"',
});

/**
 * Schema for creating a new exam with PDF upload
 * Validates:
 * - Required subject and grade level IDs (UUID format)
 * - Optional topic (max 500 chars)
 * - Optional support agent IDs
 * - PDF file (must be .pdf, ≤25 MB)
 */
export const createExamSchema = z.object({
  subjectId: uuidSchema.refine(
    (val) => val.length > 0,
    'Subject ID is required'
  ),
  gradeLevelId: uuidSchema.refine(
    (val) => val.length > 0,
    'Grade level ID is required'
  ),
  topic: z
    .string()
    .max(500, 'Topic must be ≤500 characters')
    .optional()
    .nullable(),
  supportIds: z
    .array(uuidSchema)
    .default([]),
  pdf: z
    .instanceof(File, { message: 'PDF must be a File object' })
    .refine(
      (file) => file.type === 'application/pdf',
      'File must be a PDF (application/pdf)'
    )
    .refine(
      (file) => file.size <= 25 * 1024 * 1024,
      'PDF must be ≤25 MB'
    ),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;

/**
 * Schema for a single extracted question
 * Validates question text, type, and alternatives structure
 */
export const extractedQuestionSchema = z.object({
  question_text: z
    .string()
    .min(5, 'Question text must be at least 5 characters'),
  question_type: questionTypeSchema,
  alternatives: z
    .record(z.string(), z.string())
    .nullable()
    .default(null)
    .refine(
      (alt) => {
        if (alt === null) return true;
        return Object.keys(alt).length >= 2;
      },
      'Objective questions must have at least 2 alternatives'
    ),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;

/**
 * Schema for the complete extraction result from Edge Function
 * Validates success flag, questions array, and optional warnings/error
 */
export const extractionResultSchema = z.object({
  success: z.boolean(),
  questions: z
    .array(extractedQuestionSchema)
    .default([]),
  warnings: z
    .array(z.string().min(1))
    .optional(),
  error: z
    .string()
    .min(1)
    .optional(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

/**
 * Schema for exam status validation
 * Used when checking/updating exam state
 */
export const examStatusUpdateSchema = z.object({
  status: examStatusSchema,
  extraction_warning: z
    .string()
    .nullable()
    .optional(),
  error_message: z
    .string()
    .nullable()
    .optional(),
});

export type ExamStatusUpdate = z.infer<typeof examStatusUpdateSchema>;

/**
 * Schema for question update (teacher providing correct answer)
 * Used after extraction when teacher validates/corrects answers
 */
export const updateQuestionAnswerSchema = z.object({
  correct_answer: z
    .string()
    .min(1)
    .optional()
    .nullable(),
});

export type UpdateQuestionAnswer = z.infer<typeof updateQuestionAnswerSchema>;
