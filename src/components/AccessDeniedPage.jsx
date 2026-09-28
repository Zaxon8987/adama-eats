import { ArrowLeft, LockKeyhole, LogOut, ShieldAlert } from 'lucide-react'

const roleNames = {
  admin: 'admin',
  owner: 'restaurant owner',
  driver: 'driver',
  customer: 'customer',
}

export default function AccessDeniedPage({ role, onBack, onLogin, onSignOut }) {
  const label = roleNames[role] || role

  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <span className="access-denied-icon"><ShieldAlert size={25} /></span>
        <span className="role-login-label">Access restricted</span>
        <h1>This portal is not available for your account.</h1>
        <p>
          You are signed in, but your account does not have the <strong>{label}</strong> role required for this
          workspace. Sign in with the {label} account to continue.
        </p>
        <div className="access-denied-actions">
          <button className="role-login-submit" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to marketplace</button>
          <button className="role-login-secondary" type="button" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
        </div>
        <button className="access-denied-login" type="button" onClick={onLogin}><LockKeyhole size={14} /> Open the {label} login page</button>
      </div>
    </div>
  )
}
