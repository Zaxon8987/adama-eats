import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `+251${digits.slice(1)}`
  if (digits.startsWith('251')) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+251${digits}`
  return String(value || '')
}

function aliasEmail(phone) {
  return `p${phone.replace(/\D/g, '')}@adamaeats.app`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) return json(request, { error: 'Phone signup is not configured.' }, 500)

    const body = await request.json()
    const phone = normalizePhone(body?.phone)
    const password = String(body?.password || '')
    const fullName = String(body?.name || '').trim()
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return json(request, { error: 'Enter a valid Ethiopian phone number.' }, 400)
    if (password.length < 8) return json(request, { error: 'Password must be at least 8 characters.' }, 400)
    if (!fullName) return json(request, { error: 'Full name is required.' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email: aliasEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    })

    if (error) {
      const message = /already|registered|exists/i.test(error.message)
        ? 'An account with this phone number already exists.'
        : 'Could not create the account right now.'
      return json(request, { error: message }, /already|registered|exists/i.test(error.message) ? 409 : 400)
    }

    return json(request, { created: true, userId: data.user?.id })
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'Unexpected signup error.' }, 500)
  }
})
