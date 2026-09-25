import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const authorization = request.headers.get('Authorization')

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Supabase Edge Function secrets are not configured.' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization || '' } },
    })
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) return json({ error: 'Authentication required.' }, 401)

    const body = await request.json()
    const orderId = body?.orderId as string | undefined
    if (!orderId) return json({ error: 'orderId is required.' }, 400)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, customer_id, restaurant_id, status')
      .eq('id', orderId)
      .eq('customer_id', authData.user.id)
      .single()

    if (orderError || !order) return json({ error: 'Order not found.' }, 404)

    // This explicit demo branch keeps local development usable without pretending
    // that a real Telebirr transaction has been verified.
    if (Deno.env.get('TELEBIRR_DEMO_MODE') === 'true') {
      return json({
        demo: true,
        orderId: order.id,
        transactionId: `DEMO-${order.order_number}`,
        amount: order.total,
        status: 'pending_demo',
        message: 'Demo payment created. Replace this branch with the approved Telebirr API flow.',
      })
    }

    // Add the official Telebirr merchant request/signature flow here only after
    // the merchant agreement, sandbox/test credentials, and API documentation
    // are available. Secrets belong in Supabase secrets, never in the frontend.
    return json({
      error: 'Live Telebirr payment is not configured yet.',
      code: 'TELEBIRR_NOT_CONFIGURED',
      message: 'Add the approved Telebirr API integration and TELEBIRR_DEMO_MODE=false before accepting real payments.',
    }, 501)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected payment error.' }, 500)
  }
})
