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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json(request, { error: 'Phone verification is not configured.' }, 500)
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return json(request, { error: 'Authentication required.' }, 401)

    const body = await request.json()
    const phone = String(body?.phone || '').trim()
    if (!phone || phone !== userData.user.phone) return json(request, { error: 'Phone does not match the signed-in account.' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin
      .from('profiles')
      .update({ phone_verified_at: new Date().toISOString() })
      .eq('id', userData.user.id)
      .select('id, phone, phone_verified_at')
      .single()
    if (error) return json(request, { error: error.message }, 500)
    return json(request, { verified: true, profile: data })
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : 'Unexpected verification error.' }, 500)
  }
})
