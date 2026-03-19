/**
 * Utility functions for AI analysis and adaptation process
 * Corresponds to spec-process-adaptation.md Section 4.5
 */

import type { AdaptedAlternative } from '@/lib/types/adaptation';
import { z } from 'zod';
import { adaptedAlternativeSchema } from '@/lib/schemas/adaptation';

/**
 * Identifies question type based on alternatives field
 * @returns 'multiple_choice' if alternatives is non-null object, 'essay' otherwise
 */
export function identifyQuestionType(
  question: { alternatives?: Record<string, string> | null }
): 'multiple_choice' | 'essay' {
  return question.alternatives != null ? 'multiple_choice' : 'essay';
}

/**
 * Validates correct answer for a question type
 * MC: must be a single letter A-E; Essay: any string is valid (including empty)
 * @returns null if valid, error message string if invalid
 */
export function validateCorrectAnswer(
  answer: string,
  questionType: 'multiple_choice' | 'essay'
): string | null {
  if (questionType === 'essay') return null;
  if (!answer) return 'Correct answer is required for multiple-choice questions';
  if (!/^[A-Ea-e]$/.test(answer)) return 'Correct answer must be a single letter (A-E)';
  return null;
}

/**
 * Validates adapted alternatives count matches original (CON-001)
 * @returns null if counts match, error message string if mismatch
 */
export function validateAdaptedAlternatives(
  expected: number,
  actual: number
): string | null {
  if (expected === actual) return null;
  return `Expected ${expected} alternatives, got ${actual}`;
}

/**
 * Safely parses a raw string as AdaptedAlternative array (CON-003 fallback)
 * @returns parsed array or null if input is not a valid JSON array of alternatives
 */
export function safeParseAlternatives(
  raw: string | null
): AdaptedAlternative[] | null {
  if (raw == null) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const result = z.array(adaptedAlternativeSchema).safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Builds LLM prompt for adapting a question with a given support strategy
 * MC questions: instructs JSON output with adaptedStatement + adaptedAlternatives
 * Essay questions: instructs plain text output
 * CON-002: instructs \n for line breaks in JSON
 */
export function buildAdaptationPrompt(
  question: {
    question_text: string;
    alternatives?: Record<string, string> | null;
    correct_answer?: string | null;
  },
  support: { name: string },
  bncc: { skillCode: string; skillDescription: string }
): string {
  const isMC = identifyQuestionType(question) === 'multiple_choice';
  const baseContext = [
    `You are an educational content adaptation specialist.`,
    `BNCC Skill: ${bncc.skillCode} — ${bncc.skillDescription}`,
    `Support strategy: ${support.name}`,
    `Original question: ${question.question_text}`,
  ];

  if (question.correct_answer) {
    baseContext.push(`Correct answer: ${question.correct_answer}`);
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n');
    baseContext.push(`Original alternatives:\n${altList}`);
    baseContext.push(
      `Respond with a JSON object: { "adaptedStatement": "...", "adaptedAlternatives": [{ "label": "A", "text": "..." }, ...] }`,
      `You MUST return exactly ${Object.keys(question.alternatives).length} alternatives.`,
      `Use \\n for line breaks within JSON string values. Do NOT use actual newlines inside JSON strings.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    );
  } else {
    baseContext.push(
      `Respond with plain text only — the adapted question statement.`,
      `Do NOT wrap in JSON. Return only the adapted text.`,
      `Preserve the BNCC skill in your adaptation. Make the question accessible using the "${support.name}" strategy.`
    );
  }

  return baseContext.join('\n\n');
}
