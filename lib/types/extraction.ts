/**
 * Type definitions for PDF extraction process
 * Corresponds to spec-process-extraction.md (Section 4)
 */

/**
 * Exam status states in the extraction workflow
 * - draft: Initial state when exam is created
 * - uploading: PDF file is being uploaded to storage
 * - processing: PDF is being processed and questions are being extracted
 * - awaiting_answers: Extraction complete, awaiting teacher answers/feedback
 * - ready: All extraction and teacher feedback complete, ready for adaptation
 * - error: Extraction or processing failed
 */
export type ExamStatus = 'draft' | 'uploading' | 'processing' | 'awaiting_answers' | 'ready' | 'error';

/**
 * Question types for different question formats
 * - objective: Multiple choice or similar with alternatives
 * - essay: Open-ended questions without predefined alternatives
 */
export type QuestionType = 'objective' | 'essay';

/**
 * Exam data model representing a PDF-based assessment
 * Extends base exam fields with extraction-specific columns
 */
export interface Exam {
  /** UUID primary key */
  id: string;
  /** Reference to user who created the exam */
  user_id: string;
  /** Reference to subject (e.g., Mathematics, Portuguese) */
  subject_id: string;
  /** Reference to grade level (e.g., 9th grade) */
  grade_level_id: string;
  /** Exam title */
  title: string;
  /** Path to uploaded PDF file in storage bucket */
  file_path?: string | null;
  /** Topic or theme of the exam (user-provided context for AI) */
  topic?: string | null;
  /** Current state in extraction workflow */
  status: ExamStatus;
  /** Non-blocking warnings from partial OCR or extraction issues */
  extraction_warning?: string | null;
  /** Error message when status is 'error' */
  error_message?: string | null;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Question data model representing a single question extracted from PDF
 */
export interface Question {
  /** UUID primary key */
  id: string;
  /** Reference to parent exam */
  exam_id: string;
  /** The question text/prompt extracted from PDF */
  question_text: string;
  /** Type of question (objective or essay) */
  question_type: QuestionType;
  /** Sequence number in the exam (for ordering) */
  order_number: number;
  /** Multiple choice alternatives as {key: label} JSON (null for essay questions) */
  alternatives?: Record<string, string> | null;
  /** The correct answer or expected answer key (teacher-provided) */
  correct_answer?: string | null;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Result returned after PDF extraction process completes
 */
export interface ExtractionResult {
  /** Whether extraction succeeded (true) or failed (false) */
  success: boolean;
  /** Array of extracted questions (empty if failed) */
  questions: ExtractedQuestion[];
  /** Non-blocking warnings (e.g., "Page 3 OCR confidence < 80%") */
  warnings?: string[];
  /** Error message when success is false */
  error?: string;
}

/**
 * Single question as returned by PDF extraction (before insertion into DB)
 */
export interface ExtractedQuestion {
  /** The main question text from the PDF */
  question_text: string;
  /** Detected question type (objective or essay) */
  question_type: QuestionType;
  /** Extracted multiple choice options or null for essay */
  alternatives: Record<string, string> | null;
}
