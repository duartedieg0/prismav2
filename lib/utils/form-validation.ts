import { z } from 'zod';

/**
 * Validation utilities for new exam form
 */

// Zod schema for exam name validation
export const examNameSchema = z
  .string()
  .min(3, 'Nome deve ter pelo menos 3 caracteres')
  .max(100, 'Nome não pode exceder 100 caracteres');

// Zod schema for PDF file validation
export const pdfFileSchema = z
  .instanceof(File, { message: 'Arquivo deve ser do tipo File' })
  .refine(
    (file) => file.type === 'application/pdf',
    'Arquivo deve ser um PDF'
  )
  .refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'PDF não pode exceder 10 MB'
  );

// Zod schema for supports validation (at least 1 required)
export const supportsSchema = z
  .array(z.string().uuid('ID de suporte inválido'))
  .min(1, 'Selecione pelo menos um suporte educacional');

// Zod schema for UUID validation
export const uuidSchema = z.string().uuid('ID inválido');

// Complete form schema
export const newExamFormSchema = z.object({
  exam_name: examNameSchema,
  subject_id: uuidSchema,
  grade_level_id: uuidSchema,
  supports: supportsSchema,
  pdf_file: pdfFileSchema,
});

export type NewExamFormData = z.infer<typeof newExamFormSchema>;

/**
 * Validation functions with user-friendly messages
 */

export function validateExamName(name: string): { valid: boolean; error?: string } {
  try {
    examNameSchema.parse(name);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message };
    }
    return { valid: false, error: 'Erro ao validar nome' };
  }
}

export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  try {
    pdfFileSchema.parse(file);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message };
    }
    return { valid: false, error: 'Erro ao validar arquivo' };
  }
}

export function validateSupports(supportIds: string[]): { valid: boolean; error?: string } {
  try {
    supportsSchema.parse(supportIds);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message };
    }
    return { valid: false, error: 'Erro ao validar suportes' };
  }
}

export function validateSubjectId(id: string): { valid: boolean; error?: string } {
  try {
    uuidSchema.parse(id);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message };
    }
    return { valid: false, error: 'Disciplina inválida' };
  }
}

export function validateGradeLevelId(id: string): { valid: boolean; error?: string } {
  try {
    uuidSchema.parse(id);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message };
    }
    return { valid: false, error: 'Série inválida' };
  }
}
