import { useState } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, Phone, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { checkLoginRateLimit } from '../lib/authSecurity'

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `+251${digits.slice(1)}`
  if (digits.startsWith('251')) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+251${digits}`
  return value
}

export default function PasswordResetModal({ onClose, showToast }) {
  const [stage, setStage] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sendCode = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const normalized = normalizePhone(phone)
    try {
      if (!supabase) throw new Error('Password recovery is not configured in preview mode.')
      const limit = await checkLoginRateLimit(supabase, normalized, 'check')
      if (!limit.allowed) throw new Error(limit.message || 'Too many attempts. Try again later.')
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: false } })
      if (otpError) throw otpError
      setPhone(normalized)
      setStage('otp')
    } catch (resetError) {
      setError(resetError.message || 'Could not send a reset code.')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })
      if (verifyError) throw verifyError
      if (!data.session) throw new Error('The reset session could not be created.')
      setStage('password')
    } catch (verifyError) {
      await checkLoginRateLimit(supabase, phone, 'failure').catch(() => {})
      setError(verifyError.message || 'That code is not valid.')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (event) => {
    event.preventDefault()
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      await checkLoginRateLimit(supabase, phone, 'success').catch(() => {})
      showToast('Password updated. You are now signed in.')
      onClose()
    } catch (updateError) {
      setError(updateError.message || 'Could not update the password.')
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    setError('')
    if (stage === 'password') {
      setStage('otp')
    } else {
      setStage('phone')
      setCode('')
    }
  }

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="auth-modal phone-auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-floating" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-brand"><span className="brand-mark">ae</span><span className="brand-word">adama<span>eats</span></span></div>
        <span className="section-kicker">Account recovery</span>
        <h2>{stage === 'phone' ? 'Reset your password' : stage === 'otp' ? 'Verify your phone' : 'Choose a new password'}</h2>
        <p className="auth-intro">{stage === 'phone' ? 'We will send a temporary verification code to your phone number.' : stage === 'otp' ? `Enter the code sent to ${phone}.` : 'Your new password will be active immediately after saving.'}</p>

        {stage === 'phone' && <form className="auth-form" onSubmit={sendCode}><label>Phone number<div className="phone-input-wrap"><Phone size={16} /><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09xx xxx xxx" type="tel" inputMode="tel" autoComplete="tel" required /></div></label><button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Sending code…</> : <>Send reset code <Phone size={16} /></>}</button></form>}
        {stage === 'otp' && <form className="auth-form" onSubmit={verifyCode}><label>Verification code<input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter code" inputMode="numeric" autoComplete="one-time-code" required /></label><button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Verifying…</> : <>Verify code <CheckCircle2 size={16} /></>}</button></form>}
        {stage === 'password' && <form className="auth-form" onSubmit={updatePassword}><label>New password<div className="phone-input-wrap"><KeyRound size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" minLength="8" autoComplete="new-password" required /></div></label><button className="primary-button full-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Saving…</> : <>Save new password <CheckCircle2 size={16} /></>}</button></form>}

        {error && <div className="form-error"><Phone size={15} /> {error}</div>}
        {stage !== 'phone' && <button className="auth-back-button" type="button" onClick={back}><ArrowLeft size={15} /> Back</button>}
        <div className="demo-auth-note"><ShieldCheck size={15} /><span>Password recovery uses a temporary phone code. Normal login remains phone + password.</span></div>
      </div>
    </div>
  )
}
