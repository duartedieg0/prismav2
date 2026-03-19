/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * analyze-and-adapt Edge Function
 * Pipeline-per-question: for each question in parallel:
 *   Stage 1: BNCC + Bloom analysis via Claude API
 *   Stage 2: Adaptation per support via Claude API (parallel within question)
 *
 * Spec: spec-process-adaptation.md Section 4.5
 * Uses Claude API via REST calls (no NPM dependency in Deno)
 */

interface AnalyzeAndAdaptPayload {
  examId: string
  userId: string
}

interface ClaudeAnalysisResponse {
  skillCode: string
  skillDescription: string
  bloomLevel: string
  bloomJustification: string
}

interface AdaptedAlternative {
  label: string
  text: string
}

serve(async (req) => {
  try {
    const payload: AnalyzeAndAdaptPayload = await req.json()
    const { examId, userId } = payload

    // Validate input
    if (!examId || !userId) {
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Missing examId or userId' },
        400
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch exam with subject and grade level, and verify ownership
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, user_id, subject_id, grade_level_id, subjects(name), grade_levels(name)')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Exam not found' }, 404)
    }

    // Verify user owns the exam
    if ((exam as any).user_id !== userId) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Unauthorized' }, 403)
    }

    // Fetch questions for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, alternatives, correct_answer')
      .eq('exam_id', examId)

    if (questionsError || !questions || questions.length === 0) {
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'No questions found' },
        404
      )
    }

    // Fetch supports linked to this exam via exam_supports
    const { data: examSupports, error: supportsError } = await supabase
      .from('exam_supports')
      .select('support_id, supports(id, name)')
      .eq('exam_id', examId)

    if (supportsError) {
      console.error('Error fetching exam supports:', supportsError)
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Failed to fetch supports' },
        500
      )
    }

    const supports = (examSupports || []).map((es: any) => es.supports).filter(Boolean)

    if (supports.length === 0) {
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'No supports configured for exam' },
        400
      )
    }

    // Fetch the default Claude AI model and its API key
    const { data: aiModel, error: modelError } = await supabase
      .from('ai_models')
      .select('id, name, api_key')
      .eq('is_default', true)
      .single()

    if (modelError || !aiModel) {
      console.error('Error fetching AI model:', modelError)
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'No AI model configured' },
        500
      )
    }

    if (!aiModel.api_key) {
      console.error('AI model has no API key configured')
      return jsonResponse(
        { success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'AI model not properly configured' },
        500
      )
    }

    const claudeApiKey = aiModel.api_key
    const subjectName = (exam as any).subjects?.name || 'Unknown'
    const gradeName = (exam as any).grade_levels?.name || 'Unknown'

    let totalCompleted = 0
    let totalErrored = 0

    // Pipeline per question — all questions in parallel
    await Promise.all(
      questions.map(async (question: any) => {
        try {
          // Stage 1: BNCC + Bloom analysis
          const analysisResult = await analyzeQuestion(question, subjectName, gradeName, claudeApiKey)

          // Write analysis to questions table
          const { error: updateQuestionError } = await supabase
            .from('questions')
            .update({
              bncc_skill_code: analysisResult.skillCode,
              bncc_skill_description: analysisResult.skillDescription,
              bloom_level: analysisResult.bloomLevel,
              bloom_justification: analysisResult.bloomJustification,
            })
            .eq('id', question.id)

          if (updateQuestionError) {
            console.error(`Error updating question ${question.id}:`, updateQuestionError)
            throw updateQuestionError
          }

          // Stage 2: Adaptation per support — parallel within this question
          await Promise.all(
            supports.map(async (support: any) => {
              try {
                // Set status to processing
                await supabase
                  .from('adaptations')
                  .update({ status: 'processing', updated_at: new Date().toISOString() })
                  .eq('question_id', question.id)
                  .eq('support_id', support.id)

                const isMC = question.alternatives != null
                const systemPrompt = buildAdaptationSystemPrompt()
                const userPrompt = buildAdaptationUserPrompt(
                  question,
                  support,
                  analysisResult,
                  subjectName,
                  gradeName
                )

                const llmResponse = await callClaudeAPI(systemPrompt, userPrompt, claudeApiKey)

                if (isMC) {
                  // Parse MC response
                  try {
                    const parsed = JSON.parse(llmResponse)
                    const adapted = parsed.adaptedAlternatives as AdaptedAlternative[]
                    const originalCount = Object.keys(question.alternatives).length

                    // CON-001: validate count
                    if (!Array.isArray(adapted) || adapted.length !== originalCount) {
                      const errorMsg = `Expected ${originalCount} alternatives, got ${Array.isArray(adapted) ? adapted.length : 'invalid format'}`
                      await setAdaptationError(supabase, question.id, support.id, errorMsg)
                      totalErrored++
                      return
                    }

                    const { error: updateError } = await supabase
                      .from('adaptations')
                      .update({
                        adapted_statement: parsed.adaptedStatement,
                        adapted_alternatives: adapted,
                        bncc_skill_code: analysisResult.skillCode,
                        bncc_skill_description: analysisResult.skillDescription,
                        bloom_level: analysisResult.bloomLevel,
                        bloom_justification: analysisResult.bloomJustification,
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('question_id', question.id)
                      .eq('support_id', support.id)

                    if (updateError) {
                      console.error(`Error updating adaptation ${question.id}/${support.id}:`, updateError)
                      await setAdaptationError(supabase, question.id, support.id, String(updateError))
                      totalErrored++
                      return
                    }

                    totalCompleted++
                  } catch {
                    // CON-003: JSON parse failure — store raw text
                    console.warn(`JSON parse failed for question ${question.id}, support ${support.id}. Storing raw text.`)
                    const { error: fallbackError } = await supabase
                      .from('adaptations')
                      .update({
                        adapted_statement: llmResponse,
                        bncc_skill_code: analysisResult.skillCode,
                        bncc_skill_description: analysisResult.skillDescription,
                        bloom_level: analysisResult.bloomLevel,
                        bloom_justification: analysisResult.bloomJustification,
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('question_id', question.id)
                      .eq('support_id', support.id)

                    if (fallbackError) {
                      console.error(`Error storing fallback response:`, fallbackError)
                      await setAdaptationError(supabase, question.id, support.id, String(fallbackError))
                      totalErrored++
                      return
                    }

                    totalCompleted++
                  }
                } else {
                  // Essay: store plain text
                  const { error: essayError } = await supabase
                    .from('adaptations')
                    .update({
                      adapted_statement: llmResponse,
                      bncc_skill_code: analysisResult.skillCode,
                      bncc_skill_description: analysisResult.skillDescription,
                      bloom_level: analysisResult.bloomLevel,
                      bloom_justification: analysisResult.bloomJustification,
                      status: 'completed',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('question_id', question.id)
                    .eq('support_id', support.id)

                  if (essayError) {
                    console.error(`Error updating essay adaptation:`, essayError)
                    await setAdaptationError(supabase, question.id, support.id, String(essayError))
                    totalErrored++
                    return
                  }

                  totalCompleted++
                }
              } catch (err) {
                console.error(`Adaptation error for question ${question.id}, support ${support.id}:`, err)
                await setAdaptationError(supabase, question.id, support.id, String(err))
                totalErrored++
              }
            })
          )
        } catch (err) {
          console.error(`Pipeline error for question ${question.id}:`, err)
          // Mark all adaptations for this question as 'error' so they don't stay 'pending'
          for (const support of supports) {
            await setAdaptationError(supabase, question.id, support.id, `Analysis failed: ${String(err)}`)
          }
          totalErrored += supports.length
        }
      })
    )

    // After all pipelines: set exam status to 'ready' (partial success allowed)
    const { error: statusError } = await supabase
      .from('exams')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (statusError) {
      console.error('Error updating exam status:', statusError)
    }

    return jsonResponse({
      success: totalErrored === 0,
      adaptationsCompleted: totalCompleted,
      adaptationsErrored: totalErrored,
    })
  } catch (error) {
    console.error('analyze-and-adapt fatal error:', error)
    return jsonResponse(
      {
        success: false,
        adaptationsCompleted: 0,
        adaptationsErrored: 0,
        error: String(error),
      },
      500
    )
  }
})

// --- Helper functions ---

async function analyzeQuestion(
  question: any,
  subjectName: string,
  gradeName: string,
  claudeApiKey: string
): Promise<ClaudeAnalysisResponse> {
  const systemPrompt = `You are a pedagogical AI expert specializing in the Brazilian national curriculum (BNCC - Base Nacional Comum Curricular) and Bloom's taxonomy of cognitive learning.

Your task is to analyze educational questions and identify:
1. BNCC skill code (e.g., EF06MA01) and description that this question targets
2. Bloom's taxonomy cognitive level (remember, understand, apply, analyze, evaluate, or create)

Respond with a JSON object containing:
- skillCode: BNCC skill code (e.g., "EF06MA01")
- skillDescription: Portuguese description of the BNCC skill
- bloomLevel: One of the 6 Bloom levels (lowercase)
- bloomJustification: Explanation of why this Bloom level was assigned`

  const userPrompt = `Analyze this educational question for BNCC alignment and Bloom's taxonomy level.

Subject: ${subjectName}
Grade Level: ${gradeName}
Question: ${question.question_text}

${question.correct_answer ? `Correct Answer: ${question.correct_answer}` : ''}

Respond with ONLY valid JSON (no markdown, no extra text).`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const contentBlock = data.content[0]

    if (contentBlock.type !== 'text') {
      throw new Error(`Unexpected Claude response type: ${contentBlock.type}`)
    }

    // Parse Claude's JSON response
    const parsed = JSON.parse(contentBlock.text)

    // Validate required fields
    if (!parsed.skillCode || !parsed.skillDescription || !parsed.bloomLevel || !parsed.bloomJustification) {
      throw new Error('Claude response missing required fields')
    }

    // Validate Bloom level
    const validBloomLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    if (!validBloomLevels.includes(parsed.bloomLevel.toLowerCase())) {
      throw new Error(`Invalid Bloom level: ${parsed.bloomLevel}`)
    }

    return {
      skillCode: parsed.skillCode,
      skillDescription: parsed.skillDescription,
      bloomLevel: parsed.bloomLevel.toLowerCase(),
      bloomJustification: parsed.bloomJustification,
    }
  } catch (err) {
    console.error(`Error analyzing question ${question.id}:`, err)
    throw new Error(`Question analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

function buildAdaptationSystemPrompt(): string {
  return `You are an educational content adaptation specialist working with the Brazilian national curriculum (BNCC).

Your task is to adapt educational questions to make them accessible to students with different learning needs, while preserving the original learning objective and cognitive demand.

For multiple-choice questions, respond with JSON containing the adapted question and adapted alternatives.
For essay questions, respond with plain text only.

Always maintain the pedagogical rigor and BNCC skill level of the original question.`
}

function buildAdaptationUserPrompt(
  question: any,
  support: any,
  analysis: any,
  subjectName: string,
  gradeName: string
): string {
  const isMC = question.alternatives != null
  const lines = [
    `Adapt this educational question to be more accessible for students with ${support.name} needs.`,
    ``,
    `Subject: ${subjectName}`,
    `Grade Level: ${gradeName}`,
    `BNCC Skill: ${analysis.skillCode} — ${analysis.skillDescription}`,
    `Original Question: ${question.question_text}`,
  ]

  if (question.correct_answer) {
    lines.push(`Correct Answer: ${question.correct_answer}`)
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives as Record<string, string>)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n')
    lines.push(`Original Alternatives:\n${altList}`)
    lines.push(
      ``,
      `IMPORTANT: Respond with ONLY a JSON object (no markdown, no extra text):`,
      `{`,
      `  "adaptedStatement": "the adapted question text",`,
      `  "adaptedAlternatives": [`,
      `    { "label": "A", "text": "..." },`,
      `    { "label": "B", "text": "..." }`,
      `  ]`,
      `}`,
      ``,
      `Rules:`,
      `- Return exactly ${Object.keys(question.alternatives).length} alternatives`,
      `- Use literal \\n (backslash-n) for line breaks in JSON strings`,
      `- Valid JSON only - parseable by JSON.parse()`
    )
  } else {
    lines.push(
      ``,
      `Respond with ONLY plain text - the adapted question statement. No JSON, no markdown, no extra explanation.`
    )
  }

  return lines.join('\n')
}

async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  claudeApiKey: string
): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const contentBlock = data.content[0]

    if (contentBlock.type !== 'text') {
      throw new Error(`Unexpected Claude response type: ${contentBlock.type}`)
    }

    return contentBlock.text
  } catch (err) {
    console.error('Claude API call failed:', err)
    throw new Error(`Adaptation generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function setAdaptationError(
  supabase: any,
  questionId: string,
  supportId: string,
  errorMessage: string
) {
  await supabase
    .from('adaptations')
    .update({
      status: 'error',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('question_id', questionId)
    .eq('support_id', supportId)
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
