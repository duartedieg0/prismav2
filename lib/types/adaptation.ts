/**
 * Type definitions for adaptation process
 * Corresponds to spec-process-adaptation.md (Section 4)
 */

/**
 * Status states for adapted questions
 * - pending: Adaptation queued for processing
 * - processing: Adaptation is being processed by AI
 * - completed: Adaptation generated successfully
 * - error: Adaptation processing failed
 */
export type AdaptationStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Single alternative/option for an adapted question
 */
export interface AdaptedAlternative {
  /** Option label (e.g., 'a', 'b', 'c') */
  label: string;
  /** Option text content */
  text: string;
}

/**
 * Analysis of BNCC skills covered in a question
 */
export interface BnccAnalysis {
  /** BNCC skill code (e.g., "EF89LP01") */
  code: string;
  /** Human-readable description of the skill */
  description: string;
}

/**
 * Analysis of Bloom's taxonomy level for a question
 */
export interface BloomAnalysis {
  /** Bloom level (e.g., "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create") */
  level: string;
  /** Justification for the assigned level */
  justification: string;
}

/**
 * Adapted version of a question with supports and pedagogical analysis
 */
export interface Adaptation {
  /** UUID primary key */
  id: string;
  /** Reference to original question */
  question_id: string;
  /** Reference to support used for adaptation */
  support_id: string;
  /** Adapted statement text (accessibility improved) */
  adapted_statement: string;
  /** Adapted multiple choice alternatives (null for essay questions) */
  adapted_alternatives: AdaptedAlternative[] | null;
  /** BNCC skill code covered by this question */
  bncc_skill_code: string;
  /** BNCC skill description */
  bncc_skill_description: string;
  /** Bloom's level (e.g., "Apply") */
  bloom_level: string;
  /** Justification for the Bloom level assignment */
  bloom_justification: string;
  /** Current processing status */
  status: AdaptationStatus;
  /** Creation timestamp */
  created_at: string;
}
