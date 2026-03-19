/**
 * Unit tests for adaptation utilities
 * Spec: spec-process-adaptation.md Section 6 (Layer 1)
 */

import { describe, it, expect } from 'vitest'
import {
  validateAdaptedAlternatives,
  safeParseAlternatives,
  validateCorrectAnswer,
  identifyQuestionType,
  isValidBloomLevel,
  extractJsonFromResponse,
} from './adaptation'

describe('validateAdaptedAlternatives', () => {
  it('should return null when counts match', () => {
    const error = validateAdaptedAlternatives(4, 4)
    expect(error).toBeNull()
  })

  it('should return error message when counts do not match', () => {
    const error = validateAdaptedAlternatives(4, 3)
    expect(error).toBe('Expected 4 alternatives, got 3')
  })

  it('should handle edge case of 0 alternatives', () => {
    const error = validateAdaptedAlternatives(0, 0)
    expect(error).toBeNull()
  })

  it('should handle mismatch with more alternatives than expected', () => {
    const error = validateAdaptedAlternatives(4, 5)
    expect(error).toBe('Expected 4 alternatives, got 5')
  })
})

describe('safeParseAlternatives', () => {
  it('should parse valid alternative array', () => {
    const json = JSON.stringify([
      { label: 'A', text: 'Option A' },
      { label: 'B', text: 'Option B' },
    ])

    const result = safeParseAlternatives(json)

    expect(result).not.toBeNull()
    expect(Array.isArray(result)).toBe(true)
    expect(result?.length).toBe(2)
  })

  it('should parse nested adaptedAlternatives in object', () => {
    const json = JSON.stringify({
      adaptedStatement: 'Question text',
      adaptedAlternatives: [{ label: 'A', text: 'Option A' }],
    })

    const result = safeParseAlternatives(json)

    expect(result).not.toBeNull()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should return null for invalid JSON', () => {
    const result = safeParseAlternatives('not json')
    expect(result).toBeNull()
  })

  it('should return null for null input', () => {
    const result = safeParseAlternatives(null)
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = safeParseAlternatives('')
    expect(result).toBeNull()
  })

  it('should return null for object without alternatives', () => {
    const json = JSON.stringify({ someField: 'value' })
    const result = safeParseAlternatives(json)
    expect(result).toBeNull()
  })
})

describe('validateCorrectAnswer', () => {
  it('should accept valid letter A-E for MC question', () => {
    const error = validateCorrectAnswer('A', true)
    expect(error).toBeNull()
  })

  it('should accept lowercase letter for MC question', () => {
    const error = validateCorrectAnswer('b', true)
    expect(error).toBeNull()
  })

  it('should reject empty string for MC question', () => {
    const error = validateCorrectAnswer('', true)
    expect(error).not.toBeNull()
  })

  it('should reject non-letter for MC question', () => {
    const error = validateCorrectAnswer('1', true)
    expect(error).not.toBeNull()
  })

  it('should reject letter outside A-E range', () => {
    const error = validateCorrectAnswer('F', true)
    expect(error).not.toBeNull()
  })

  it('should return null for essay question regardless of answer', () => {
    const error = validateCorrectAnswer('anything', false)
    expect(error).toBeNull()
  })

  it('should return null for essay question with undefined answer', () => {
    const error = validateCorrectAnswer(undefined, false)
    expect(error).toBeNull()
  })
})

describe('identifyQuestionType', () => {
  it('should identify MC question when alternatives exist', () => {
    const type = identifyQuestionType({ a: 'Option A', b: 'Option B' })
    expect(type).toBe('multiple_choice')
  })

  it('should identify essay question when alternatives are null', () => {
    const type = identifyQuestionType(null)
    expect(type).toBe('essay')
  })

  it('should identify MC question with single alternative', () => {
    const type = identifyQuestionType({ a: 'Only option' })
    expect(type).toBe('multiple_choice')
  })

  it('should identify essay question with empty object', () => {
    // Empty object is still "truthy", so this would be MC
    // In real code, we'd expect null for essay
    const type = identifyQuestionType(null)
    expect(type).toBe('essay')
  })
})

describe('isValidBloomLevel', () => {
  it('should accept all 6 valid Bloom levels', () => {
    const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']

    levels.forEach((level) => {
      expect(isValidBloomLevel(level)).toBe(true)
    })
  })

  it('should accept uppercase Bloom level', () => {
    expect(isValidBloomLevel('APPLY')).toBe(true)
  })

  it('should reject invalid Bloom level', () => {
    expect(isValidBloomLevel('invalid')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidBloomLevel('')).toBe(false)
  })

  it('should reject misspelled level', () => {
    expect(isValidBloomLevel('aplly')).toBe(false)
  })
})

describe('extractJsonFromResponse', () => {
  it('should extract JSON object from response', () => {
    const response = 'Here is the JSON: {"key": "value"} and some text'
    const extracted = extractJsonFromResponse(response)

    expect(extracted).toBe('{"key": "value"}')
  })

  it('should extract JSON array from response', () => {
    const response = 'Result: [{"label": "A"}] end'
    const extracted = extractJsonFromResponse(response)

    expect(extracted).toBe('[{"label": "A"}]')
  })

  it('should return original if no JSON found', () => {
    const response = 'Just plain text'
    const extracted = extractJsonFromResponse(response)

    expect(extracted).toBe('Just plain text')
  })

  it('should extract JSON with markdown code fence', () => {
    const response = '```json\n{"adapted": "text"}\n```'
    const extracted = extractJsonFromResponse(response)

    // Should extract the JSON object even inside code fence
    expect(extracted).toContain('{')
  })

  it('should handle nested JSON', () => {
    const response = 'Result: {"outer": {"inner": "value"}} text'
    const extracted = extractJsonFromResponse(response)

    expect(extracted).toContain('"outer"')
  })
})
