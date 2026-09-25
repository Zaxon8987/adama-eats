import { useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import { dashboardOrders } from '../data'
import { LiveDriverDashboard, LiveOwnerDashboard } from './LiveDashboards'

function formatETB(amount) {
  return `${Number(amount || 0).toLocaleString('en-ET')} ETB`
}

function initials(value = 'Partner') {
  return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const portalConfig = {
  admin: {
    label: 'Admin command center',
    shortLabel: 'Admin',
    theme: 'admin',
    icon: LayoutDashboard,
    description: 'A clear view of approvals, orders, restaurants, and delivery health.',
    nav: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
      { id: 'orders', label: 'All orders', icon: ShoppingBag },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  owner: {
    label: 'Restaurant workspace',
    shortLabel: 'Owner',
    theme: 'owner',
    icon: Store,
    description: 'Keep your menu, prices, photos, and delivery settings up to date.',
    nav: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'menu', label: 'Menu & food', icon: Utensils },
      { id: 'orders', label: 'Orders', icon: ShoppingBag },
      { id: 'settings', label: 'Restaurant settings', icon: Settings },
    ],
  },
  driver: {
    label: 'Driver dispatch hub',
    shortLabel: 'Driver',
    theme: 'driver',
    icon: Bike,
    description: 'See nearby deliveries, accept jobs, and keep customers informed.',
    nav: [
      { id: 'overview', label: 'Dispatch board', icon: LayoutDashboard },
      { id: 'available', label: 'Available orders', icon: PackageCheck },
      { id: 'active', label: 'My delivery', icon: Bike },
      { id: 'earnings', label: 'Earnings', icon: CircleDollarSign },
    ],
  },
}

function PortalShell({ role, user, profile, activeNav, setActiveNav, onAccount, onMarketplace, children, showToast }) {
  const config = portalConfig[role]
  const Icon = config.icon
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = profile?.full_name || user?.user_metadata?.full_name || config.shortLabel

  return (
    <div className={`role-portal portal-theme-${config.theme}`}>
      <aside className={`portal-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-top">
          <button className="portal-brand" type="button" onClick={onMarketplace}><span className="portal-brand-mark">ae</span><span>adama<span>eats</span></span></button>
          <button className="portal-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="portal-workspace-label"><span className="portal-workspace-icon"><Icon size={16} /></span><span><small>Workspace</small><strong>{config.label}</strong></span></div>
        <nav className="portal-nav" aria-label={`${config.shortLabel} navigation`}>
          <span className="portal-nav-caption">Manage</span>
          {config.nav.map((item) => { const NavIcon = item.icon; return <button key={item.id} className={activeNav === item.id ? 'active' : ''} type="button" onClick={() => { setActiveNav(item.id); setMobileOpen(false); if (item.id !== 'overview') showToast(`${item.label} view selected`, 'info') }}><NavIcon size={17} /><span>{item.label}</span>{item.id === 'approvals' && <span className="portal-nav-count">3</span>}</button> })}
        </nav>
        <div className="portal-sidebar-bottom">
          <div className="portal-help-card"><span><Sparkles size={15} /></span><strong>Need a hand?</strong><small>Our partner support team is here for you.</small><button type="button" onClick={() => showToast('Support request started', 'info')}>Contact support <ArrowRight size={13} /></button></div>
          <button className="portal-user-card" type="button" onClick={onAccount}><span className="portal-user-avatar">{initials(displayName)}</span><span><strong>{displayName}</strong><small>{profile?.phone || config.shortLabel}</small></span><MoreHorizontal size={16} /></button>
        </div>
      </aside>
      {mobileOpen && <button className="portal-sidebar-overlay" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className="portal-main">
        <header className="portal-topbar"><button className="portal-mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="portal-breadcrumb"><span>Adama Eats</span><ChevronRight size={14} /><strong>{config.shortLabel} portal</strong></div><div className="portal-top-actions"><span className="portal-live-chip"><i /> {role === 'admin' ? 'Live operations' : role === 'owner' ? 'Partner workspace' : 'Dispatch online'}</span><button className="portal-icon-button" type="button" onClick={() => showToast('You are all caught up', 'info')} aria-label="Notifications"><Bell size={18} /><i /></button><button className="portal-back-button" type="button" onClick={onMarketplace}><ExternalLink size={15} /> Marketplace</button></div></header>
        <div className="portal-content">{children}</div>
      </main>
    </div>
  )
}

function AdminPortal({ approvalItems, approveRequest, showToast, activeNav, profile }) {
  if (activeNav === 'approvals') return <AdminApprovals approvalItems={approvalItems} approveRequest={approveRequest} showToast={showToast} />
  if (activeNav === 'orders') return <AdminOrders />
  if (activeNav === 'reports') return <AdminReports />
  return <AdminOverview approvalItems={approvalItems} approveRequest={approveRequest} showToast={showToast} displayName={profile?.full_name || 'Admin'} />
}

function AdminPageHeading({ eyebrow, title, description, action }) {
  return <div className="portal-page-heading"><div><span className="portal-eyebrow"><i /> {eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function AdminOverview({ approvalItems, approveRequest, showToast, displayName }) {
  return <>
    <AdminPageHeading eyebrow="Friday · Adama" title={`Good morning, ${displayName.split(' ')[0] || 'Admin'}`} description="Here is what needs your attention across the platform today." action={<button className="portal-primary-button" type="button" onClick={() => showToast('Export prepared for download', 'success')}><BarChart3 size={16} /> Export report</button>} />
    <div className="portal-stat-grid"><PortalStat icon={CircleDollarSign} label="Gross order value" value="ETB 184,260" change="+12.8%" tone="green" /><PortalStat icon={ShoppingBag} label="Orders today" value="42" change="+8.4%" tone="orange" /><PortalStat icon={Store} label="Live restaurants" value="18" change="3 pending" tone="blue" /><PortalStat icon={Users} label="Active drivers" value="11" change="2 online now" tone="purple" /></div>
    <div className="portal-admin-grid"><section className="portal-surface portal-approval-surface"><div className="portal-surface-heading"><div><span className="portal-eyebrow"><i /> Needs attention</span><h2>Partner approvals</h2></div><button className="portal-link-button" type="button" onClick={() => showToast('Use Approvals in the sidebar to review all requests', 'info')}>View all <ArrowRight size={14} /></button></div><div className="portal-approval-list">{approvalItems.slice(0, 4).map((request) => <PortalApprovalRow key={request.id} request={request} onApprove={() => approveRequest(request, true)} onReject={() => approveRequest(request, false)} />)}{!approvalItems.length && <div className="portal-empty-row"><CheckCircle2 size={20} /><span>No pending approvals</span></div>}</div></section><AdminActivityChart /></div>
    <section className="portal-surface portal-recent-orders"><div className="portal-surface-heading"><div><span className="portal-eyebrow"><i /> Live feed</span><h2>Recent orders</h2></div><button className="portal-link-button" type="button" onClick={() => showToast('Use All orders in the sidebar', 'info')}>View all <ArrowRight size={14} /></button></div><AdminOrderTable /></section>
  </>
}

function PortalStat({ icon: Icon, label, value, change, tone }) {
  return <div className="portal-stat"><span className={`portal-stat-icon ${tone}`}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><span><Activity size={11} /> {change}</span></div></div>
}

function PortalApprovalRow({ request, onApprove, onReject }) {
  return <div className="portal-approval-row"><span className={`portal-request-avatar ${request.tone || 'mama'}`}>{request.initials || initials(request.name)}</span><div className="portal-request-copy"><strong>{request.name}</strong><small>{request.type} · {request.detail}</small></div><span className="portal-pending-tag">Pending</span><button className="portal-reject-button" type="button" onClick={onReject}>Reject</button><button className="portal-approve-button" type="button" onClick={onApprove}><Check size={15} /></button></div>
}

function AdminApprovals({ approvalItems, approveRequest, showToast }) {
  return <><AdminPageHeading eyebrow="Admin · Review queue" title="Partner approvals" description="Review restaurant owners and drivers before they join the live marketplace." action={<span className="portal-count-chip">{approvalItems.length} pending</span>} /><section className="portal-surface portal-full-surface"><div className="portal-surface-heading"><div><span className="portal-eyebrow"><i /> Approval queue</span><h2>Applications waiting for review</h2></div><button className="portal-filter-button" type="button" onClick={() => showToast('Showing all pending applications', 'info')}>All applications <ChevronRight size={14} /></button></div><div className="portal-approval-list portal-approval-list-large">{approvalItems.length ? approvalItems.map((request) => <PortalApprovalRow key={request.id} request={request} onApprove={() => approveRequest(request, true)} onReject={() => approveRequest(request, false)} />) : <div className="portal-empty-state"><CheckCircle2 size={28} /><h3>All caught up</h3><p>New owner and driver applications will appear here.</p></div>}</div></section></>
}

function AdminActivityChart() {
  return <section className="portal-surface portal-chart-surface"><div className="portal-surface-heading"><div><span className="portal-eyebrow"><i /> Last 7 days</span><h2>Order activity</h2></div><button className="portal-filter-button" type="button">This week <ChevronRight size={14} /></button></div><div className="portal-chart"><div className="portal-chart-axis"><span>50</span><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="portal-chart-body"><div className="portal-chart-lines"><i /><i /><i /><i /><i /><i /></div><div className="portal-bars"><span style={{ height: '34%' }} /><span style={{ height: '51%' }} /><span style={{ height: '44%' }} /><span style={{ height: '67%' }} /><span style={{ height: '59%' }} /><span style={{ height: '82%' }} /><span style={{ height: '76%' }} /></div><div className="portal-chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div></section>
}

function AdminOrders() {
  return <><AdminPageHeading eyebrow="Admin · Order operations" title="All orders" description="Track every order from payment to delivery across Adama." action={<button className="portal-primary-button" type="button"><ExternalLink size={15} /> Open operations</button>} /><section className="portal-surface portal-full-surface"><div className="portal-surface-heading"><div><span className="portal-eyebrow"><i /> Live order feed</span><h2>Latest orders</h2></div><span className="portal-count-chip">42 today</span></div><AdminOrderTable /></section></>
}

function AdminOrderTable() {
  return <div className="portal-order-table"><div className="portal-order-head"><span>Order</span><span>Customer</span><span>Restaurant</span><span>Total</span><span>Status</span><span /></div>{dashboardOrders.map((order) => <div className="portal-order-line" key={order.id}><strong>{order.id}</strong><span>{order.customer}</span><span>{order.restaurant}</span><strong>{formatETB(order.total)}</strong><span className={`portal-status ${order.tone}`}>{order.status}</span><button className="portal-icon-button" type="button"><MoreHorizontal size={16} /></button></div>)}</div>
}

function AdminReports() {
  return <><AdminPageHeading eyebrow="Admin · Insights" title="Reports and performance" description="A simple operating view for making better marketplace decisions." /><div className="portal-report-grid"><PortalReportCard icon={BarChart3} title="Order growth" value="+18.4%" detail="Compared with the previous week" tone="green" /><PortalReportCard icon={Store} title="Restaurant retention" value="92%" detail="Partners active this month" tone="orange" /><PortalReportCard icon={Clock3} title="Average prep time" value="18 min" detail="Across approved restaurants" tone="blue" /></div><section className="portal-surface portal-placeholder-surface"><span><Sparkles size={23} /></span><h2>More reports are coming</h2><p>Sales, delivery, commission, and partner performance reports will appear here.</p></section></>
}

function PortalReportCard({ icon: Icon, title, value, detail, tone }) {
  return <div className="portal-report-card"><span className={`portal-stat-icon ${tone}`}><Icon size={18} /></span><small>{title}</small><strong>{value}</strong><span>{detail}</span></div>
}

export default function RolePortal({
  role,
  user,
  profile,
  ownerWorkspace,
  ownerItems,
  addOwnerFood,
  createRestaurant,
  addOwnerFoodItem,
  toggleOwnerFood,
  driverWorkspace,
  createDriverProfile,
  setDriverAvailability,
  acceptDriverOrder,
  updateDriverStatus,
  approvalItems,
  approveRequest,
  liveAdmin,
  liveOwner,
  liveDriver,
  liveLoading,
  showToast,
  navigate,
  onAccount,
}) {
  const [activeNav, setActiveNav] = useState('overview')
  const config = portalConfig[role]
  if (!config) return null

  let content
  if (role === 'admin') {
    content = <AdminPortal approvalItems={approvalItems} approveRequest={approveRequest} showToast={showToast} activeNav={activeNav} profile={profile} />
  } else if (role === 'owner') {
    content = <LiveOwnerDashboard restaurant={ownerWorkspace.restaurant} foodItems={liveOwner ? ownerWorkspace.foodItems : ownerItems} loading={liveLoading} createRestaurant={createRestaurant} addFood={addOwnerFoodItem} toggleFood={toggleOwnerFood} showToast={showToast} />
  } else {
    content = <LiveDriverDashboard profile={driverWorkspace.profile} availableOrders={liveDriver ? driverWorkspace.availableOrders : []} activeOrder={liveDriver ? driverWorkspace.activeOrder : null} loading={liveLoading} createProfile={createDriverProfile} setAvailability={setDriverAvailability} acceptOrder={acceptDriverOrder} updateStatus={updateDriverStatus} showToast={showToast} />
  }

  return <PortalShell role={role} user={user} profile={profile} activeNav={activeNav} setActiveNav={setActiveNav} onAccount={onAccount} onMarketplace={() => navigate('home')} showToast={showToast}>{content}</PortalShell>
}
