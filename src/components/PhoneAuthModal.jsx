import { ArrowLeft, CheckCircle2, Phone, ShieldCheck, Sparkles, X } from 'lucide-react'

export default function PhoneAuthModal({
  mode,
  setMode,
  form,
  setForm,
  stage,
  setStage,
  role,
  setRole,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const changeMode = (nextMode) => {
    setMode(nextMode)
    setStage('phone')
    setForm((current) => ({ ...current, code: '' }))
  }

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="auth-modal phone-auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-floating" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-brand"><span className="brand-mark">ae</span><span className="brand-word">adama<span>eats</span></span></div>
        <span className="section-kicker">Secure phone access</span>
        <h2>{stage === 'otp' ? 'Enter your code' : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-intro">{stage === 'otp' ? `We sent a one-time verification code to ${form.phone}.` : 'Use your Ethiopian phone number. We will send you a one-time code by SMS.'}</p>

        <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => changeMode('signin')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => changeMode('signup')}>Create account</button></div>

        <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
          {stage === 'phone' ? <>
            {mode === 'signup' && <label>Full name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
            <label>Phone number<div className="phone-input-wrap"><Phone size={16} /><input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="09xx xxx xxx" type="tel" inputMode="tel" autoComplete="tel" required /></div></label>
            {mode === 'signup' && <label>Account type<select value={role} onChange={(event) => setRole(event.target.value)}><option value="customer">Customer</option><option value="owner">Restaurant owner</option><option value="driver">Driver</option></select><small className="field-hint">Owner and driver applications are reviewed by an admin. Admin access is private.</small></label>}
            <button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Sending code…</> : <>{mode === 'signup' ? 'Send verification code' : 'Send login code'} <Phone size={16} /></>}</button>
          </> : <>
            <label>Verification code<input className="otp-input" value={form.code} onChange={(event) => update('code', event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter 6–8 digit code" inputMode="numeric" autoComplete="one-time-code" required /></label>
            <button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Verifying…</> : <>Verify and continue <CheckCircle2 size={16} /></>}</button>
            <button className="auth-back-button" type="button" onClick={() => { setStage('phone'); setForm((current) => ({ ...current, code: '' })) }}><ArrowLeft size={15} /> Change phone number</button>
          </>}</form>

        {error && <div className="form-error"><Phone size={15} /> {error}</div>}
        <div className="demo-auth-note"><ShieldCheck size={15} /><span>Your phone number is used for sign-in and delivery updates. We never display your verification code.</span></div>
        <p className="auth-legal">By continuing, you agree to our terms and privacy policy.</p>
      </div>
    </div>
  )
}
