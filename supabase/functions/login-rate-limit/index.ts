import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const allowedOrigins = [
  'https://zaxon8987.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  })
}

async function hashPhone(phone: string) {
  const pepper = Deno.env.get('LOGIN_RATE_LIMIT_PEPPER') || ''
  const bytes = new TextEncoder().encode(`${pepper}:${phone}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) return json(request, { error: 'Rate-limit service is not configured.' }, 500)

    const body = await request.json()
    const phone = String(body?.phone || '').trim()
    const action = String(body?.action || 'check')
    if (!phone || !['check', 'failure', 'success'].includes(action)) {
      return json(request, { error: 'phone and a valid action are required.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const phoneHash = await hashPhone(phone)
    const now = Date.now()
    const { data: current, error: readError } = await admin
      .from('auth_rate_limits')
      .select('*')
      .eq('phone_hash', phoneHash)
      .maybeSingle()
    if (readError) return json(request, { error: readError.message }, 500)

    const blockedUntil = current?.blocked_until ? new Date(current.blocked_until).getTime() : 0
    if (blockedUntil > now && action !== 'success') {
      return json(request, {
        allowed: false,
        retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000),
        message: 'Too many login attempts. Try again later.',
      }, 200)
    }

    if (action === 'check') {
      return json(request, { allowed: true, retryAfterSeconds: 0 })
    }

    if (action === 'success') {
      if (current) await admin.from('auth_rate_limits').delete().eq('phone_hash', phoneHash)
      return json(request, { allowed: true })
    }

    const windowExpired = !current || now - new Date(current.window_started_at).getTime() > WINDOW_MS
    const failedAttempts = (windowExpired ? 0 : Number(current.failed_attempts || 0)) + 1
    const shouldBlock = failedAttempts >= MAX_FAILURES
    const nextBlockedUntil = shouldBlock ? new Date(now + BLOCK_MS).toISOString() : null
    const { error: writeError } = await admin.from('auth_rate_limits').upsert({
      phone_hash: phoneHash,
      window_started_at: windowExpired ? new Date(now).toISOString() : current.window_started_at,
      failed_attempts: failedAttempts,
      blocked_until: nextBlockedUntil,
      last_attempt_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    })
    if (writeError) return json(request, { error: writeError.message }, 500)

    return json(request, {
      allowed: !shouldBlock,
      retryAfterSeconds: shouldBlock ? Math.ceil(BLOCK_MS / 1000) : 0,
      message: shouldBlock ? 'Too many login attempts. Try again later.' : undefined,
    }, 200)
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'Unexpected rate-limit error.' }, 500)
  }
})
