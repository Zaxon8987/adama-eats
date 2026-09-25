import { CheckCircle2, KeyRound, Phone, ShieldCheck, X } from 'lucide-react'

export default function PhoneAuthModal({
  mode,
  setMode,
  form,
  setForm,
  role,
  setRole,
  onReset,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const changeMode = (nextMode) => {
    setMode(nextMode)
    setForm((current) => ({ ...current, password: '' }))
  }

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="auth-modal phone-auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-floating" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-brand"><span className="brand-mark">ae</span><span className="brand-word">adama<span>eats</span></span></div>
        <span className="section-kicker">Secure account access</span>
        <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-intro">Use your Ethiopian phone number and a password. No SMS verification is required for this MVP.</p>

        <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => changeMode('signin')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => changeMode('signup')}>Create account</button></div>

        <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
          {mode === 'signup' && <label>Full name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
          <label>Phone number<div className="phone-input-wrap"><Phone size={16} /><input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="09xx xxx xxx" type="tel" inputMode="tel" autoComplete="tel" required /></div></label>
          <label>Password<div className="phone-input-wrap"><KeyRound size={16} /><input value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" type="password" minLength="8" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></div></label>
          {mode === 'signup' && <label>Account type<select value={role} onChange={(event) => setRole(event.target.value)}><option value="customer">Customer</option><option value="owner">Restaurant owner</option><option value="driver">Driver</option></select><small className="field-hint">Owner and driver applications are reviewed by an admin. Admin access is private.</small></label>}
          {mode === 'signin' && <button className="forgot-password-button" type="button" onClick={onReset}>Forgot password?</button>}
          <button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Please wait…</> : <>{mode === 'signin' ? 'Sign in with phone' : 'Create account'} <CheckCircle2 size={16} /></>}</button>
        </form>

        {error && <div className="form-error"><Phone size={15} /> {error}</div>}
        <div className="demo-auth-note"><ShieldCheck size={15} /><span>Your password is protected by Supabase Auth. Use a strong password and do not share it.</span></div>
        <p className="auth-legal">By continuing, you agree to our terms and privacy policy.</p>
      </div>
    </div>
  )
}
