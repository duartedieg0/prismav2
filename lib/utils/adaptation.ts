/**
 * Utility functions for question adaptation
 * Used by both Edge Functions and API routes
 */

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'

export interface AdaptedAlternative {
  label: string
  text: string
}

export interface BnccAnalysis {
  skillCode: string
  skillDescription: string
}

export interface BloomAnalysis {
  level: BloomLevel
  justification: string
}

export interface AdaptationResponse {
  adaptedStatement?: string
  adaptedAlternatives?: AdaptedAlternative[]
}

/**
 * Validates that adapted alternatives count matches original count
 * CON-001: adaptedAlternatives.length MUST equal original alternatives.length
 */
export function validateAdaptedAlternatives(expectedCount: number, actualCount: number): string | null {
  if (actualCount !== expectedCount) {
    return `Expected ${expectedCount} alternatives, got ${actualCount}`
  }
  return null
}

/**
 * Safely parses a response that may be either JSON (for MC) or plain text (for essay)
 * CON-003: JSON parse failure falls back to treating full response as plain text
 */
export function safeParseAlternatives(response: string | null): AdaptedAlternative[] | null {
  if (!response) return null

  try {
    const parsed = JSON.parse(response)

    if (Array.isArray(parsed)) {
      return parsed
    }

    // Also handle case where response is { adaptedAlternatives: [...] }
    if (parsed.adaptedAlternatives && Array.isArray(parsed.adaptedAlternatives)) {
      return parsed.adaptedAlternatives
    }

    return null
  } catch {
    // Parse failed - this is expected for essay questions or malformed responses
    return null
  }
}

/**
 * Validates correct answer format for multiple-choice questions
 * Valid: single letter A-E
 */
export function validateCorrectAnswer(answer: string | undefined, isMC: boolean): string | null {
  if (!isMC) return null

  if (!answer || answer.trim().length === 0) {
    return 'Correct answer is required for multiple-choice questions'
  }

  const normalized = answer.toUpperCase().trim()
  if (!/^[A-E]$/.test(normalized)) {
    return 'Correct answer must be a single letter (A-E)'
  }

  return null
}

/**
 * Identifies question type based on whether alternatives exist
 */
export function identifyQuestionType(alternatives: Record<string, string> | null): 'multiple_choice' | 'essay' {
  return alternatives ? 'multiple_choice' : 'essay'
}

/**
 * Validates Bloom level is one of the 6 cognitive levels
 */
export function isValidBloomLevel(level: string): level is BloomLevel {
  const validLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
  return validLevels.includes(level.toLowerCase() as BloomLevel)
}

/**
 * Extracts JSON object from a response that may contain markdown or extra text
 * Used to handle Claude responses that may include markdown code fences
 */
export function extractJsonFromResponse(response: string): string {
  // Try to find JSON object or array in the response
  const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/)

  if (jsonMatch) {
    return jsonMatch[0]
  }

  // If no JSON found, return original (may be valid JSON or plain text)
  return response
}

/**
 * Builds system prompt for BNCC/Bloom analysis
 */
export function buildAnalysisSystemPrompt(): string {
  return `You are a pedagogical AI expert specializing in the Brazilian national curriculum (BNCC - Base Nacional Comum Curricular) and Bloom's taxonomy of cognitive learning.

Your task is to analyze educational questions and identify:
1. BNCC skill code (e.g., EF06MA01) and description that this question targets
2. Bloom's taxonomy cognitive level (remember, understand, apply, analyze, evaluate, or create)

Respond with a JSON object containing:
- skillCode: BNCC skill code (e.g., "EF06MA01")
- skillDescription: Portuguese description of the BNCC skill
- bloomLevel: One of the 6 Bloom levels (lowercase)
- bloomJustification: Explanation of why this Bloom level was assigned`
}

/**
 * Builds system prompt for adaptation generation
 */
export function buildAdaptationSystemPrompt(): string {
  return `You are an educational content adaptation specialist working with the Brazilian national curriculum (BNCC).

Your task is to adapt educational questions to make them accessible to students with different learning needs, while preserving the original learning objective and cognitive demand.

For multiple-choice questions, respond with JSON containing the adapted question and adapted alternatives.
For essay questions, respond with plain text only.

Always maintain the pedagogical rigor and BNCC skill level of the original question.`
}
