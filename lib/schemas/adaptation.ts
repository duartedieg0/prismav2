/**
 * Zod validation schemas for AI analysis and adaptation process
 * Corresponds to spec-process-adaptation.md (Section 4.3)
 */

import { z } from 'zod';

export const bloomLevelSchema = z.enum([
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
]);

export const bnccAnalysisSchema = z.object({
  skillCode: z.string().min(1, 'BNCC skill code is required'),
  skillDescription: z.string().min(1, 'BNCC skill description is required'),
});

export type BnccAnalysisInput = z.infer<typeof bnccAnalysisSchema>;

export const bloomAnalysisSchema = z.object({
  level: bloomLevelSchema,
  justification: z.string().min(1, 'Bloom justification is required'),
});

export type BloomAnalysisInput = z.infer<typeof bloomAnalysisSchema>;

export const adaptedAlternativeSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1),
});

export const adaptationResponseSchema = z.union([
  z.object({
    adaptedStatement: z.string().min(1),
    adaptedAlternatives: z.array(adaptedAlternativeSchema).min(1),
  }),
  z.string().min(1),
]);

export type AdaptationResponse = z.infer<typeof adaptationResponseSchema>;

export const submitAnswerOptionalSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  correctAnswer: z.string().min(1).optional(),
});

export const submitAnswersSchema = z.object({
  answers: z.array(submitAnswerOptionalSchema).min(1, 'At least one answer is required'),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
