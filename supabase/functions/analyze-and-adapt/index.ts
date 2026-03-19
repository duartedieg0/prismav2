import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * analyze-and-adapt Edge Function
 * Pipeline-per-question: for each question in parallel:
 *   Stage 1: BNCC + Bloom analysis via LLM
 *   Stage 2: Adaptation per support via LLM (parallel within question)
 *
 * Spec: spec-process-adaptation.md Section 4.5
 */

interface AnalyzeAndAdaptPayload {
  examId: string
  userId: string
}

interface AdaptedAlternative {
  label: string
  text: string
}

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const

serve(async (req) => {
  try {
    const payload: AnalyzeAndAdaptPayload = await req.json()
    const { examId } = payload

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch exam with subject and grade level
    const { data: exam } = await supabase
      .from('exams')
      .select('id, subject_id, grade_level_id, subjects(name), grade_levels(name)')
      .eq('id', examId)
      .single()

    if (!exam) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'Exam not found' })
    }

    // Fetch questions for this exam
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, alternatives, correct_answer')
      .eq('exam_id', examId)

    if (!questions || questions.length === 0) {
      return jsonResponse({ success: false, adaptationsCompleted: 0, adaptationsErrored: 0, error: 'No questions found' })
    }

    // Fetch supports linked to this exam via exam_supports
    const { data: examSupports } = await supabase
      .from('exam_supports')
      .select('support_id, supports(id, name)')
      .eq('exam_id', examId)

    const supports = (examSupports || []).map((es: any) => es.supports).filter(Boolean)

    const subjectName = (exam as any).subjects?.name || 'Unknown'
    const gradeName = (exam as any).grade_levels?.name || 'Unknown'

    let totalCompleted = 0
    let totalErrored = 0

    // Pipeline per question — all questions in parallel
    await Promise.all(
      questions.map(async (question: any) => {
        try {
          // Stage 1: BNCC + Bloom analysis
          const analysisResult = await analyzeQuestion(question, subjectName, gradeName)

          // Write analysis to questions table
          await supabase
            .from('questions')
            .update({
              bncc_skill_code: analysisResult.skillCode,
              bncc_skill_description: analysisResult.skillDescription,
              bloom_level: analysisResult.bloomLevel,
              bloom_justification: analysisResult.bloomJustification,
            })
            .eq('id', question.id)

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
                const prompt = buildPrompt(question, support, analysisResult, subjectName, gradeName)

                // TODO: Replace with actual LLM call via ai_models config
                const llmResponse = await callLLM(prompt)

                if (isMC) {
                  // Parse MC response
                  try {
                    const parsed = JSON.parse(llmResponse)
                    const adapted = parsed.adaptedAlternatives as AdaptedAlternative[]
                    const originalCount = Object.keys(question.alternatives).length

                    // CON-001: validate count
                    if (adapted.length !== originalCount) {
                      await setAdaptationError(
                        supabase, question.id, support.id,
                        `Expected ${originalCount} alternatives, got ${adapted.length}`
                      )
                      totalErrored++
                      return
                    }

                    await supabase
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

                    totalCompleted++
                  } catch {
                    // CON-003: JSON parse failure — store raw text
                    console.warn(`JSON parse failed for question ${question.id}, support ${support.id}. Storing raw text.`)
                    await supabase
                      .from('adaptations')
                      .update({
                        adapted_statement: llmResponse,
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('question_id', question.id)
                      .eq('support_id', support.id)

                    totalCompleted++
                  }
                } else {
                  // Essay: store plain text
                  await supabase
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
    await supabase
      .from('exams')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', examId)

    return jsonResponse({
      success: totalErrored === 0,
      adaptationsCompleted: totalCompleted,
      adaptationsErrored: totalErrored,
    })
  } catch (error) {
    console.error('analyze-and-adapt fatal error:', error)
    return jsonResponse({
      success: false,
      adaptationsCompleted: 0,
      adaptationsErrored: 0,
      error: String(error),
    }, 500)
  }
})

// --- Helper functions ---

async function analyzeQuestion(
  question: any,
  subjectName: string,
  gradeName: string
): Promise<{ skillCode: string; skillDescription: string; bloomLevel: string; bloomJustification: string }> {
  // TODO: Replace with actual LLM call for BNCC + Bloom analysis
  // Placeholder implementation
  return {
    skillCode: 'EF00XX00',
    skillDescription: `Habilidade identificada para questão de ${subjectName}`,
    bloomLevel: 'understand',
    bloomJustification: `Questão de ${gradeName} requer compreensão do conceito`,
  }
}

function buildPrompt(
  question: any,
  support: any,
  analysis: { skillCode: string; skillDescription: string },
  subjectName: string,
  gradeName: string
): string {
  const isMC = question.alternatives != null
  const lines = [
    `You are an educational content adaptation specialist.`,
    `Subject: ${subjectName}, Grade: ${gradeName}`,
    `BNCC Skill: ${analysis.skillCode} — ${analysis.skillDescription}`,
    `Support strategy: ${support.name}`,
    `Original question: ${question.question_text}`,
  ]

  if (question.correct_answer) {
    lines.push(`Correct answer: ${question.correct_answer}`)
  }

  if (isMC && question.alternatives) {
    const altList = Object.entries(question.alternatives)
      .map(([key, val]) => `${key}) ${val}`)
      .join('\n')
    lines.push(`Original alternatives:\n${altList}`)
    lines.push(
      `Respond with JSON: { "adaptedStatement": "...", "adaptedAlternatives": [{ "label": "A", "text": "..." }, ...] }`,
      `Return exactly ${Object.keys(question.alternatives).length} alternatives.`,
      `Use \\n for line breaks in JSON strings.`
    )
  } else {
    lines.push(`Respond with plain text only — the adapted question statement.`)
  }

  return lines.join('\n\n')
}

async function callLLM(prompt: string): Promise<string> {
  // TODO: Implement actual LLM call using ai_models.api_key
  // This placeholder returns a mock response
  console.log('LLM call placeholder — prompt length:', prompt.length)
  return JSON.stringify({
    adaptedStatement: 'Adapted question placeholder',
    adaptedAlternatives: [
      { label: 'A', text: 'Adapted option A' },
      { label: 'B', text: 'Adapted option B' },
      { label: 'C', text: 'Adapted option C' },
      { label: 'D', text: 'Adapted option D' },
    ],
  })
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
