import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (_req) => {
  // TODO: implement in spec-process-evolution task
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
