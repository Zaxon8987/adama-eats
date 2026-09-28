import assert from 'node:assert/strict'
import { readHashLoginRole, readHashRole, readIntendedRole, resolvePortalAccess, writeIntendedRole } from '../src/lib/portalRouting.js'

const cases = []
function test(name, fn) {
  cases.push([name, fn])
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

test('portal hash routes are read from the url', () => {
  assert.equal(readHashRole('#admin'), 'admin')
  assert.equal(readHashRole('#owner'), 'owner')
  assert.equal(readHashRole('#driver'), 'driver')
  assert.equal(readHashRole('#ADMIN'), 'admin')
  assert.equal(readHashRole(''), null)
  assert.equal(readHashRole('#login/owner'), null)
})

test('login hash routes are read from the url', () => {
  assert.equal(readHashLoginRole('#login/customer'), 'customer')
  assert.equal(readHashLoginRole('#login/owner'), 'owner')
  assert.equal(readHashLoginRole('#login/admin'), 'admin')
  assert.equal(readHashLoginRole('#owner'), null)
  assert.equal(readHashLoginRole('#login/root'), null)
})

test('the intended account type survives a reload until sign out', () => {
  const storage = memoryStorage()
  writeIntendedRole('owner', storage)
  assert.equal(readIntendedRole(storage), 'owner')
  writeIntendedRole('customer', storage)
  assert.equal(readIntendedRole(storage), null)
  writeIntendedRole('driver', storage)
  writeIntendedRole(null, storage)
  assert.equal(readIntendedRole(storage), null)
})

test('admin access is never remembered from the sign in page', () => {
  const storage = memoryStorage()
  writeIntendedRole('admin', storage)
  assert.equal(readIntendedRole(storage), null)
})

test('an admin account keeps the admin portal', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'admin' }), { role: 'admin', denied: null })
  assert.deepEqual(resolvePortalAccess({ profileRole: 'admin', requestedRole: 'admin' }), { role: 'admin', denied: null })
})

test('a customer account can never open a partner portal', () => {
  for (const requestedRole of ['admin', 'owner', 'driver']) {
    assert.deepEqual(
      resolvePortalAccess({ profileRole: 'customer', requestedRole }),
      { role: 'customer', denied: requestedRole },
    )
  }
})

test('a customer account without a request stays on the marketplace', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'customer' }), { role: 'customer', denied: null })
  assert.deepEqual(resolvePortalAccess({ profileRole: 'customer', hasRestaurant: true }), { role: 'customer', denied: null })
})

test('signing in as a partner opens onboarding before an application exists', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'customer', intendedRole: 'owner' }), { role: 'owner', denied: null })
  assert.deepEqual(resolvePortalAccess({ profileRole: 'customer', intendedRole: 'driver' }), { role: 'driver', denied: null })
})

test('a pending restaurant application keeps the owner workspace', () => {
  assert.deepEqual(
    resolvePortalAccess({ profileRole: 'customer', requestedRole: 'owner', hasRestaurant: true }),
    { role: 'owner', denied: null },
  )
  assert.deepEqual(
    resolvePortalAccess({ profileRole: 'customer', intendedRole: 'owner', hasRestaurant: true }),
    { role: 'owner', denied: null },
  )
})

test('a pending driver application keeps the driver workspace', () => {
  assert.deepEqual(
    resolvePortalAccess({ profileRole: 'customer', intendedRole: 'driver', hasDriverProfile: true }),
    { role: 'driver', denied: null },
  )
  assert.deepEqual(
    resolvePortalAccess({ profileRole: 'customer', requestedRole: 'driver' }),
    { role: 'customer', denied: 'driver' },
  )
})

test('a partner account keeps its own portal on a plain reload', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'owner' }), { role: 'owner', denied: null })
  assert.deepEqual(resolvePortalAccess({ profileRole: 'driver' }), { role: 'driver', denied: null })
})

test('an owner asking for the admin portal is denied', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'owner', requestedRole: 'admin' }), { role: 'owner', denied: 'admin' })
  assert.deepEqual(resolvePortalAccess({ profileRole: 'owner', requestedRole: 'driver' }), { role: 'owner', denied: 'driver' })
})

test('an unknown role in the database falls back to customer', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'superuser' }), { role: 'customer', denied: null })
})

test('admin access is never granted by the remembered sign in role', () => {
  assert.deepEqual(resolvePortalAccess({ profileRole: 'customer', intendedRole: 'admin' }), { role: 'customer', denied: null })
})

let failed = 0
for (const [name, fn] of cases) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL - ${name}\n${error.message}`)
  }
}
console.log(`\n${cases.length - failed}/${cases.length} passed`)
if (failed) process.exit(1)
