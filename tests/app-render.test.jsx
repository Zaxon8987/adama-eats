import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../src/App.jsx'

// Minimal browser stub: the first render of the app only needs the location
// hash, storage and timers. Supabase stays unconfigured, so the app runs on its
// local demo data and no network call is made.
function stubBrowser(hash) {
  const store = new Map()
  const location = { hash, pathname: '/', origin: 'http://localhost' }
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  globalThis.window = {
    location,
    localStorage: storage,
    sessionStorage: storage,
    setTimeout,
    clearTimeout,
    scrollTo: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  globalThis.localStorage = storage
  globalThis.sessionStorage = storage
  return location
}

const customerPage = renderWithHash('#login/customer')
assert.ok(customerPage.includes('role-login-customer'), 'the customer link shows the customer login page')
assert.ok(customerPage.includes('Good food is waiting.'), 'the customer link shows customer copy')
assert.ok(!customerPage.includes('portal-shell') && !customerPage.includes('AdminPageHeading'), 'no portal is rendered before sign in')

for (const [hash, expectedClass, headline] of [
  ['#admin', 'role-login-admin', 'Keep the platform healthy.'],
  ['#owner', 'role-login-owner', 'Run your kitchen with clarity.'],
  ['#driver', 'role-login-driver', 'Keep Adama moving.'],
]) {
  const markup = renderWithHash(hash)
  assert.ok(markup.includes(expectedClass), `${hash} shows the ${expectedClass} page`)
  assert.ok(markup.includes(headline), `${hash} shows its own headline`)
  assert.ok(!markup.includes('portal-shell'), `${hash} never renders a portal without a session`)
}

const home = renderWithHash('')
assert.ok(home.includes('Good food.'), 'the root url still opens the customer marketplace')

function renderWithHash(hash) {
  stubBrowser(hash)
  return renderToStaticMarkup(<App />)
}

console.log('app renders the right screen for every portal link')
