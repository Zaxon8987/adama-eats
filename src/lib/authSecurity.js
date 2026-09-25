export async function checkLoginRateLimit(client, phone, action = 'check') {
  if (!client) return { allowed: true }
  const { data, error } = await client.functions.invoke('login-rate-limit', {
    body: { phone, action },
  })
  if (error) throw new Error('Login protection is temporarily unavailable. Please try again.')
  return data || { allowed: true }
}
