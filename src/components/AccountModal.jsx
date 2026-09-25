import { useState } from 'react'
import { CheckCircle2, LogOut, Phone, ShieldCheck, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const phoneVerificationEnabled = import.meta.env.VITE_PHONE_VERIFICATION_ENABLED === 'true'

export default function AccountModal({ user, profile, onClose, onVerified, onSignOut, showToast }) {
  const [stage, setStage] = useState('idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const verified = Boolean(profile?.phone_verified_at)
  const phone = user?.phone || profile?.phone || 'Not added'

  const sendVerification = async () => {
    setError('')
    setLoading(true)
    try {
      if (!phoneVerificationEnabled) throw new Error('Optional phone verification is not enabled yet.')
      if (!user?.phone) throw new Error('This account does not have a phone number.')
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: user.phone, options: { shouldCreateUser: false } })
      if (otpError) throw otpError
      setStage('code')
    } catch (verificationError) {
      setError(verificationError.message || 'Could not start phone verification.')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: user.phone, token: code, type: 'sms' })
      if (verifyError) throw verifyError
      if (!data.session) throw new Error('The verification session could not be created.')
      const { error: markError } = await supabase.functions.invoke('mark-phone-verified', { body: { phone: user.phone } })
      if (markError) throw markError
      onVerified?.()
      setStage('idle')
      showToast('Phone number verified')
      onClose()
    } catch (verificationError) {
      setError(verificationError.message || 'That verification code is not valid.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="auth-modal account-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-floating" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="account-avatar"><UserRound size={24} /></div>
        <span className="section-kicker">Your account</span>
        <h2>{profile?.full_name || user?.user_metadata?.full_name || 'Adama Eats member'}</h2>
        <p className="auth-intro">Manage your account and security settings.</p>
        <div className="account-details"><div><span className="account-detail-icon"><Phone size={15} /></span><span><small>Phone number</small><strong>{phone}</strong></span></div><div><span className="account-detail-icon"><ShieldCheck size={15} /></span><span><small>Workspace</small><strong>{profile?.role || 'customer'}</strong></span></div></div>
        <div className={`verification-card ${verified ? 'verified' : ''}`}><div className="verification-card-heading"><span>{verified ? <CheckCircle2 size={18} /> : <Phone size={18} />}</span><div><strong>{verified ? 'Phone verified' : 'Optional phone verification'}</strong><small>{verified ? 'Your phone is protected for recovery.' : 'Add SMS verification later for stronger account recovery.'}</small></div></div>{!verified && phoneVerificationEnabled && stage === 'idle' && <button className="outline-button full-button" type="button" onClick={sendVerification} disabled={loading}>{loading ? 'Starting…' : 'Verify phone number'}</button>}{!verified && phoneVerificationEnabled && stage === 'code' && <form className="verification-form" onSubmit={verifyCode}><input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter SMS code" inputMode="numeric" autoComplete="one-time-code" /><button className="primary-button" type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Confirm code'}</button></form>}</div>
        {error && <div className="form-error"><Phone size={15} /> {error}</div>}
        <button className="account-signout" type="button" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        <p className="auth-legal">Admin access is never selectable from the public account form.</p>
      </div>
    </div>
  )
}
