import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import RoleLoginPage from '../src/components/RoleLoginPage.jsx'
import AccessDeniedPage from '../src/components/AccessDeniedPage.jsx'

const noop = () => {}

function renderLogin(role, mode = 'signin') {
  return renderToStaticMarkup(
    <RoleLoginPage
      role={role}
      mode={mode}
      setMode={noop}
      form={{ name: '', phone: '', password: '' }}
      setForm={noop}
      loading={false}
      error=""
      onSubmit={noop}
      onBack={noop}
      onForgotPassword={noop}
      onSwitchRole={noop}
    />,
  )
}

const customer = renderLogin('customer')
const owner = renderLogin('owner')
const driver = renderLogin('driver')
const admin = renderLogin('admin')

// Every account type gets its own page, not one shared login screen.
for (const [role, markup, expected] of [
  ['customer', customer, 'Good food is waiting.'],
  ['owner', owner, 'Run your kitchen with clarity.'],
  ['driver', driver, 'Keep Adama moving.'],
  ['admin', admin, 'Keep the platform healthy.'],
]) {
  assert.ok(markup.includes(expected), `${role} page should show its own headline`)
  assert.ok(markup.includes('role-login-page'), `${role} page should render the login shell`)
}

assert.notEqual(customer, owner)
assert.notEqual(owner, driver)
assert.notEqual(driver, admin)

// The admin page never offers public sign up.
assert.ok(!admin.includes('Create account</button>'), 'admin page must not offer public sign up')
assert.ok(admin.includes('invitation-only'), 'admin page should state that access is private')
assert.ok(owner.includes('Create account</button>'), 'owner page should allow partner sign up')
assert.ok(driver.includes('Create account</button>'), 'driver page should allow driver sign up')

// All four account types are reachable from every login page.
for (const markup of [customer, owner, driver, admin]) {
  for (const label of ['Customer', 'Restaurant', 'Driver', 'Admin']) {
    assert.ok(markup.includes(`>${label}</button>`), `login page should link to the ${label} login page`)
  }
}

const signup = renderLogin('owner', 'signup')
assert.ok(signup.includes('Full name'), 'sign up should ask for a full name')
assert.ok(!renderLogin('owner', 'signin').includes('Full name'), 'sign in should not ask for a full name')

const denied = renderToStaticMarkup(<AccessDeniedPage role="owner" onBack={noop} onLogin={noop} onSignOut={noop} />)
assert.ok(denied.includes('restaurant owner'), 'access denied page should name the required role')
assert.ok(denied.includes('Sign out'), 'access denied page should offer sign out')

console.log('role login pages render as expected')
