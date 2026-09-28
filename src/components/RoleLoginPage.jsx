import { ArrowLeft, ArrowRight, Bike, CheckCircle2, KeyRound, LockKeyhole, Phone, ShieldCheck, Sparkles, Store, UserRound, Utensils } from 'lucide-react'

const roleContent = {
  customer: {
    label: 'Customer access',
    title: 'Good food is waiting.',
    description: 'Sign in to order from your favorite Adama restaurants and track every delivery.',
    icon: Utensils,
    accent: 'customer',
    points: ['Order from local restaurants', 'Track deliveries in real time', 'Save your favorite meals'],
  },
  owner: {
    label: 'Restaurant partner access',
    title: 'Run your kitchen with clarity.',
    description: 'Manage your menu, prices, photos, and incoming orders from one focused workspace.',
    icon: Store,
    accent: 'owner',
    points: ['Publish dishes in minutes', 'Set your own ETB prices', 'Manage delivery fees'],
  },
  driver: {
    label: 'Driver partner access',
    title: 'Keep Adama moving.',
    description: 'See nearby deliveries, accept the jobs that fit your route, and get paid for every trip.',
    icon: Bike,
    accent: 'driver',
    points: ['Accept available orders', 'Update delivery status', 'See your delivery activity'],
  },
  admin: {
    label: 'Private operations access',
    title: 'Keep the platform healthy.',
    description: 'A private workspace for approvals, orders, restaurants, drivers, and platform operations.',
    icon: ShieldCheck,
    accent: 'admin',
    points: ['Review partner applications', 'Monitor every order', 'Protect platform quality'],
  },
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `+251${digits.slice(1)}`
  if (digits.startsWith('251')) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+251${digits}`
  return value
}

const accountTabs = [
  { role: 'customer', label: 'Customer' },
  { role: 'owner', label: 'Restaurant' },
  { role: 'driver', label: 'Driver' },
  { role: 'admin', label: 'Admin' },
]

export default function RoleLoginPage({ role, mode, setMode, form, setForm, loading, error, onSubmit, onBack, onForgotPassword, onSwitchRole }) {
  const content = roleContent[role] || roleContent.customer
  const Icon = content.icon
  const isAdmin = role === 'admin'
  const currentMode = isAdmin ? 'signin' : mode === 'signup' ? 'signup' : 'signin'
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const changeMode = (nextMode) => {
    setMode(nextMode)
    setForm((current) => ({ ...current, password: '' }))
  }

  return (
    <div className={`role-login-page role-login-${content.accent}`}>
      <div className="role-login-shell">
        <section className="role-login-story">
          <button className="role-login-brand" type="button" onClick={onBack}><span className="role-login-mark">ae</span><span>adama<span>eats</span></span></button>
          <div className="role-login-story-copy"><span className="role-login-label"><i /> {content.label}</span><h1>{content.title}</h1><p>{content.description}</p><ul>{content.points.map((point) => <li key={point}><CheckCircle2 size={16} /> {point}</li>)}</ul></div>
          <div className="role-login-quote"><Sparkles size={16} /><span>Built for the people who make Adama taste like home.</span></div>
        </section>
        <section className="role-login-form-side">
          <button className="role-login-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to marketplace</button>
          <div className="role-login-form-card"><div className="role-login-form-heading"><span className="role-login-icon"><Icon size={21} /></span><span className="role-login-label">{content.label}</span><h2>{currentMode === 'signin' ? 'Sign in to continue' : 'Create your account'}</h2><p>{isAdmin ? 'Admin access is private and invitation-only.' : 'Use your Ethiopian phone number and password.'}</p></div>
            {!isAdmin && <div className="role-login-tabs"><button className={currentMode === 'signin' ? 'active' : ''} type="button" onClick={() => changeMode('signin')}>Sign in</button><button className={currentMode === 'signup' ? 'active' : ''} type="button" onClick={() => changeMode('signup')}>Create account</button></div>}
            <form className="role-login-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, phone: normalizePhone(form.phone) }) }}>
              {currentMode === 'signup' && <label>Full name<div className="role-login-input"><UserRound size={16} /><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your full name" autoComplete="name" required /></div></label>}
              <label>Phone number<div className="role-login-input"><Phone size={16} /><input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="09xx xxx xxx" type="tel" inputMode="tel" autoComplete="tel" required /></div></label>
              <label>Password<div className="role-login-input"><KeyRound size={16} /><input value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" type="password" minLength="8" autoComplete={currentMode === 'signin' ? 'current-password' : 'new-password'} required /></div></label>
              {error && <div className="role-login-error"><LockKeyhole size={15} /> {error}</div>}
              <button className="role-login-submit" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Please wait…</> : <>{currentMode === 'signin' ? `Sign in as ${content.label.replace(' access', '')}` : `Create ${content.label.replace(' access', '')} account`} <ArrowRight size={16} /></>}</button>
            </form>
            {currentMode === 'signin' && !isAdmin && <button className="role-login-forgot" type="button" onClick={onForgotPassword}>Forgot password?</button>}
            <div className="role-login-security"><ShieldCheck size={15} /><span>{isAdmin ? 'Protected operations area · admin role required' : 'Your account is connected securely to Adama Eats.'}</span></div>
          </div>
          {onSwitchRole && (
            <nav className="role-login-switch" aria-label="Choose an account type">
              <span>Signing in as</span>
              <div>
                {accountTabs.map((tab) => (
                  <button
                    className={tab.role === role ? 'active' : ''}
                    key={tab.role}
                    type="button"
                    disabled={tab.role === role}
                    onClick={() => onSwitchRole(tab.role)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          )}
          <p className="role-login-legal">By continuing, you agree to the Adama Eats terms and privacy policy.</p>
        </section>
      </div>
    </div>
  )
}
