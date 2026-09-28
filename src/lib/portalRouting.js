export const portalRoles = ['admin', 'owner', 'driver']
export const accountRoles = ['customer', ...portalRoles]

const INTENDED_ROLE_KEY = 'adama-eats-intended-role'

function hashValue(hash) {
  return String(hash ?? '').replace(/^#\/?/, '').toLowerCase()
}

// The portal a URL asks for: #admin, #owner or #driver
export function readHashRole(hash) {
  const raw = hashValue(hash)
  return portalRoles.includes(raw) ? raw : null
}

// The login page a URL asks for: #login/customer, #login/owner, ...
export function readHashLoginRole(hash) {
  const raw = hashValue(hash)
  if (!raw.startsWith('login/')) return null
  const requested = raw.slice('login/'.length)
  return accountRoles.includes(requested) ? requested : null
}

// Remembers the account type used for sign in during this browser session so a
// partner application that is still pending keeps its own workspace on reload.
export function readIntendedRole(storage) {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : null)
    const stored = store?.getItem(INTENDED_ROLE_KEY)
    return accountRoles.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export function writeIntendedRole(role, storage) {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : null)
    if (!store) return
    // Admin access is never remembered, it always comes from the database role.
    if (role === 'owner' || role === 'driver') store.setItem(INTENDED_ROLE_KEY, role)
    else store.removeItem(INTENDED_ROLE_KEY)
  } catch {
    /* storage is unavailable in this browser */
  }
}

/**
 * Decides which workspace a signed in account may open.
 *
 * - The database profile role always wins.
 * - A requested role (from a #admin/#owner/#driver link) is only granted when the
 *   account matches, and a mismatch is reported as `denied` so the UI can show
 *   an access restricted page instead of the portal.
 * - The account type used to sign in keeps a partner workspace reachable so a new
 *   restaurant owner or driver can finish onboarding, and it only exposes rows
 *   that belong to that account. Admin access is never granted this way.
 */
export function resolvePortalAccess({ profileRole = 'customer', requestedRole = null, intendedRole = null, hasRestaurant = false, hasDriverProfile = false } = {}) {
  const safeProfileRole = accountRoles.includes(profileRole) ? profileRole : 'customer'
  const requested = accountRoles.includes(requestedRole) ? requestedRole : null
  const intended = accountRoles.includes(intendedRole) && intendedRole !== 'admin' ? intendedRole : null
  const target = requested || intended

  if (!requested && safeProfileRole !== 'customer') return { role: safeProfileRole, denied: null }
  if (target === 'admin') {
    return safeProfileRole === 'admin' ? { role: 'admin', denied: null } : { role: safeProfileRole, denied: 'admin' }
  }
  if (target === 'owner') {
    const allowed = safeProfileRole === 'owner' || hasRestaurant || (!requested && intended === 'owner')
    return allowed ? { role: 'owner', denied: null } : { role: safeProfileRole, denied: requested ? 'owner' : null }
  }
  if (target === 'driver') {
    const allowed = safeProfileRole === 'driver' || hasDriverProfile || (!requested && intended === 'driver')
    return allowed ? { role: 'driver', denied: null } : { role: safeProfileRole, denied: requested ? 'driver' : null }
  }
  return { role: safeProfileRole, denied: null }
}
