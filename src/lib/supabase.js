import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// The app deliberately runs with local demo data when these values are absent.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

export async function createTelebirrPayment(payload) {
  if (!supabase) {
    return {
      demo: true,
      transactionId: `DEMO-${Date.now()}`,
      message: 'Demo payment created. Connect the Telebirr Edge Function for live payments.',
    }
  }

  const { data, error } = await supabase.functions.invoke('telebirr-create-payment', {
    body: payload,
  })

  if (error) throw error
  return data
}
