/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * extract-questions Edge Function
 * Fetches a PDF from URL, extracts questions using pdf-parse,
 * detects question type (objective/essay), and saves to database.
 *
 * Spec: spec-process-extraction.md Section 4.2
 */

interface ExtractQuestionsPayload {
  examId: string
  userId: string
  pdfBase64: string
  topic?: string
}

interface ExtractedQuestion {
  id: string
  questionNumber: number
  type: 'objective' | 'essay'
  statement: string
  alternatives?: Record<string, string>
}


/**
 * Decode PDF from base64 and extract text using pdf-parse
 */
async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  try {
    // Decode base64 PDF
    const pdfBuffer = Uint8Array.from(atob(pdfBase64.split(',')[1] || pdfBase64), c => c.charCodeAt(0))
    const bytes = pdfBuffer

    // Import pdf-parse for Deno
    const { default: pdfParse } = await import('https://deno.land/x/pdf@v1.8.1/mod.ts')

    // Parse PDF
    const data = await pdfParse(bytes)

    if (!data || !data.text) {
      throw new Error('Failed to extract text from PDF')
    }

    return data.text
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Split extracted text into individual questions
 * Uses numbering patterns (1., 2., 3., etc.) and double newlines as delimiters
 *
 * TODO: Replace regex extraction with Claude vision API in Phase 2
 * Current limitation: regex-based extraction works for standard formats but may fail on:
 * - Complex multi-column layouts
 * - Image-based questions
 * - Non-Latin scripts
 * This requires multimodal LLM integration (Claude vision) and may be better implemented
 * as a Next.js API route instead of Edge Function for better resource management.
 */
function splitIntoQuestions(text: string): string[] {
  // First try to split by numbered patterns like "1.", "2.", etc.
  const numberedPattern = /^\s*(\d+)[\.\)]\s+/m
  const lines = text.split('\n')
  const questions: string[] = []
  let currentQuestion = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Check if this line starts a new question
    if (numberedPattern.test(line) && currentQuestion.trim().length > 0) {
      questions.push(currentQuestion.trim())
      currentQuestion = trimmed
    } else if (trimmed.length > 0) {
      currentQuestion += (currentQuestion.length > 0 ? ' ' : '') + trimmed
    }
  }

  // Add final question
  if (currentQuestion.trim().length > 0) {
    questions.push(currentQuestion.trim())
  }

  // If no questions found by numbering, try splitting by double newlines
  if (questions.length === 0) {
    const chunks = text.split(/\n\n+/)
    return chunks.filter((chunk) => chunk.trim().length > 20) // Ignore very short chunks
  }

  return questions.filter((q) => q.length > 10) // Filter out very short/empty questions
}

/**
 * Detect question type based on content
 * - Objective: Contains multiple choice markers (a), (b), (c), (d) or A), B), C), D)
 * - Essay: Default for anything else
 */
function detectQuestionType(questionText: string): 'objective' | 'essay' {
  const mcPattern = /\([a-dA-D]\)|[a-dA-D]\)|^[a-dA-D]\s+[–-]|\n\s*[a-dA-D]\s+[–-]/m
  return mcPattern.test(questionText) ? 'objective' : 'essay'
}

/**
 * Extract alternatives from objective question text
 * Returns object like { a: "text", b: "text", ... }
 */
function extractAlternatives(questionText: string): Record<string, string> | null {
  const alternatives: Record<string, string> = {}
  const lines = questionText.split('\n')
  let foundAlternatives = false

  // Pattern for alternatives: (a) text, a) text, A) text, a - text
  const altPattern = /^[)\s]*([a-dA-D])[)\s-]+(.+)$/

  for (const line of lines) {
    const match = line.trim().match(altPattern)
    if (match) {
      const key = match[1].toLowerCase()
      alternatives[key] = match[2].trim()
      foundAlternatives = true
    }
  }

  return foundAlternatives ? alternatives : null
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const payload: ExtractQuestionsPayload = await req.json()
    const { examId, userId, pdfBase64 } = payload

    // Validate input
    if (!examId || !userId || !pdfBase64) {
      return jsonResponse({ success: false, error: 'Missing required fields: examId, userId, pdfBase64', code: 'VALIDATION_ERROR' }, 400)
    }

    // Initialize Supabase client with service role (for RLS bypass)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify exam exists
    const { data: exam, error: examError } = await supabase.from('exams').select('id, user_id').eq('id', examId).single()

    if (examError || !exam) {
      return jsonResponse({ success: false, examId, questionCount: 0, error: 'Exam not found', code: 'EXAM_NOT_FOUND' }, 404)
    }

    // Verify user owns the exam
    if (exam.user_id !== userId) {
      return jsonResponse(
        { error: 'Unauthorized', code: 'FORBIDDEN' },
        403
      )
    }

    // Extract text from PDF
    let pdfText: string
    try {
      pdfText = await extractTextFromPdf(pdfBase64)
    } catch (error) {
      // Update exam with error status
      await supabase
        .from('exams')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'PDF parsing failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', examId)

      return jsonResponse({
        success: false,
        examId,
        questionCount: 0,
        error: 'Failed to parse PDF',
        code: 'PDF_PARSE_ERROR',
      })
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return jsonResponse({
        success: false,
        examId,
        questionCount: 0,
        error: 'PDF contains no extractable text',
        code: 'NO_TEXT_FOUND',
      })
    }

    // Split into questions
    const questionTexts = splitIntoQuestions(pdfText)

    if (questionTexts.length === 0) {
      return jsonResponse({
        success: false,
        examId,
        questionCount: 0,
        error: 'No questions could be extracted from PDF',
        code: 'NO_QUESTIONS_FOUND',
      })
    }

    // Process each question and insert into database
    const insertedQuestions: ExtractedQuestion[] = []

    for (let i = 0; i < questionTexts.length; i++) {
      const questionText = questionTexts[i]
      const questionType = detectQuestionType(questionText)
      const alternatives = questionType === 'objective' ? extractAlternatives(questionText) : null

      const { data: insertedQuestion, error: insertError } = await supabase
        .from('questions')
        .insert({
          exam_id: examId,
          question_text: questionText,
          order_number: i + 1,
          alternatives: alternatives,
        })
        .select('id, question_text, order_number, alternatives')
        .single()

      if (insertError) {
        console.error(`Failed to insert question ${i + 1}:`, insertError)
        // Continue with other questions instead of failing
        continue
      }

      if (insertedQuestion) {
        insertedQuestions.push({
          id: insertedQuestion.id,
          questionNumber: i + 1,
          type: questionType,
          statement: questionText.substring(0, 100) + (questionText.length > 100 ? '...' : ''),
          alternatives: alternatives || undefined,
        })
      }
    }

    // Update exam status to 'processing' (awaiting answers/supports)
    const { error: updateError } = await supabase
      .from('exams')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)

    if (updateError) {
      console.error('Failed to update exam status:', updateError)
    }

    return jsonResponse({
      success: true,
      examId,
      questionCount: insertedQuestions.length,
      questions: insertedQuestions,
      warnings: [],
    })
  } catch (error) {
    console.error('Extract questions error:', error)
    return jsonResponse(
      {
        success: false,
        examId: '',
        questionCount: 0,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500
    )
  }
})

/**
 * Helper to return JSON response with proper headers
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
