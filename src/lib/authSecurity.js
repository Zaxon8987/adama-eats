export function phoneAliasEmail(phone) {
  return `p${String(phone || '').replace(/\D/g, '')}@adamaeats.app`
}

export async function signUpWithPhone(client, { phone, password, name }) {
  if (!client) throw new Error('Phone signup is not configured.')
  const { data, error } = await client.functions.invoke('phone-password-signup', {
    body: { phone, password, name },
  })
  if (error) throw new Error(error.message || 'Could not create the account right now.')
  return data
}

export async function checkLoginRateLimit(client, phone, action = 'check') {
  if (!client) return { allowed: true }
  const { data, error } = await client.functions.invoke('login-rate-limit', {
    body: { phone, action },
  })
  if (error) throw new Error('Login protection is temporarily unavailable. Please try again.')
  return data || { allowed: true }
}
