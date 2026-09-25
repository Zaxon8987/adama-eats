import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ShieldCheck,
  Store,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'

function formatETB(amount) {
  return `${Number(amount || 0).toLocaleString('en-ET')} ETB`
}

function initials(value = 'Partner') {
  return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function LiveOwnerDashboard({
  restaurant,
  foodItems,
  loading,
  createRestaurant,
  addFood,
  toggleFood,
  showToast,
}) {
  const [showRegistration, setShowRegistration] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restaurantForm, setRestaurantForm] = useState({ name: '', cuisine: '', description: '', phone: '', deliveryFee: '60' })
  const [foodForm, setFoodForm] = useState({ name: '', price: '', description: '', category: 'Traditional', popular: false })
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (restaurant) setShowRegistration(false)
  }, [restaurant])

  const updateRestaurant = (key, value) => setRestaurantForm((current) => ({ ...current, [key]: value }))
  const updateFood = (key, value) => setFoodForm((current) => ({ ...current, [key]: value }))

  const submitRestaurant = async (event) => {
    event.preventDefault()
    if (!restaurantForm.name) return
    setSaving(true)
    try {
      await createRestaurant(restaurantForm)
      setRestaurantForm({ name: '', cuisine: '', description: '', phone: '', deliveryFee: '60' })
    } catch (error) {
      showToast(error.message || 'Could not submit restaurant application', 'warning')
    } finally {
      setSaving(false)
    }
  }

  const submitFood = async (event) => {
    event.preventDefault()
    if (!foodForm.name || !foodForm.price) return
    setSaving(true)
    try {
      await addFood(foodForm, file)
      setFoodForm({ name: '', price: '', description: '', category: 'Traditional', popular: false })
      setFile(null)
      setShowForm(false)
    } catch {
      // The parent displays the actionable error toast.
    } finally {
      setSaving(false)
    }
  }

  if (loading && !restaurant) {
    return <div className="live-workspace-loading"><span className="spinner spinner-dark" /><strong>Loading your restaurant workspace…</strong><span>Fetching your profile, menu, and approval status.</span></div>
  }

  if (!restaurant || showRegistration) {
    return (
      <section className="onboarding-panel">
        <div className="onboarding-icon"><Store size={25} /></div>
        <span className="section-kicker">Partner onboarding</span>
        <h2>Bring your kitchen to Adama</h2>
        <p>Register your restaurant, add your menu, and wait for an admin to approve your partner account.</p>
        <form className="onboarding-form" onSubmit={submitRestaurant}>
          <div className="onboarding-form-grid">
            <label>Restaurant name<input value={restaurantForm.name} onChange={(event) => updateRestaurant('name', event.target.value)} placeholder="e.g. Adama Kitchen" required /></label>
            <label>Cuisine<input value={restaurantForm.cuisine} onChange={(event) => updateRestaurant('cuisine', event.target.value)} placeholder="Traditional, coffee…" /></label>
            <label>Phone number<input value={restaurantForm.phone} onChange={(event) => updateRestaurant('phone', event.target.value)} placeholder="09xx xxx xxx" /></label>
            <label>Delivery fee (ETB)<input value={restaurantForm.deliveryFee} onChange={(event) => updateRestaurant('deliveryFee', event.target.value)} type="number" min="0" /></label>
            <label className="full-field">About your restaurant<textarea value={restaurantForm.description} onChange={(event) => updateRestaurant('description', event.target.value)} placeholder="Tell Adama what makes your food special" rows="3" /></label>
          </div>
          <div className="onboarding-note"><ShieldCheck size={16} /><span>Your application is saved as <strong>pending</strong>. An admin must approve it before customers can find you.</span></div>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? <><span className="spinner" /> Submitting…</> : <>Submit restaurant application <ArrowRight size={16} /></>}</button>
        </form>
      </section>
    )
  }

  const pending = restaurant.approval_status !== 'approved'
  return (
    <>
      {pending && <div className="approval-banner"><span className="approval-banner-icon"><Clock3 size={18} /></span><div><strong>Your restaurant is awaiting approval</strong><span>You can prepare your menu now. Customers will see the restaurant after an admin approves it.</span></div><span className="pending-pill">Pending review</span></div>}
      <div className="dashboard-stat-grid"><LiveStat icon={PackageCheck} label="Menu items" value={foodItems.length} change="Live menu" tone="green" /><LiveStat icon={Users} label="Restaurant status" value={pending ? 'Pending' : 'Open'} change={pending ? 'Needs review' : 'Visible to customers'} tone="orange" /><LiveStat icon={Coffee} label="Delivery fee" value={formatETB(restaurant.delivery_fee)} change="Set by you" tone="blue" /><LiveStat icon={CheckCircle2} label="Profile" value={pending ? 'Draft' : 'Ready'} change="Adama Eats" tone="purple" /></div>
      <div className="dashboard-columns owner-columns">
        <section className="dashboard-panel menu-management-panel">
          <div className="panel-heading"><div><span className="section-kicker">Your live menu</span><h2>Food items <span className="count-badge">{foodItems.length}</span></h2></div><button className="primary-button small-primary" type="button" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Add food</button></div>
          {showForm && <form className="food-upload-form" onSubmit={submitFood}><div className="upload-dropzone"><Upload size={20} /><strong>{file ? file.name : 'Add a food photo'}</strong><span>JPG or PNG · up to 5 MB</span><label className="upload-button">Choose image<input type="file" accept="image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label></div><div className="upload-fields"><label>Food name<input value={foodForm.name} onChange={(event) => updateFood('name', event.target.value)} placeholder="e.g. Lamb tibs" required /></label><label>Price (ETB)<input value={foodForm.price} onChange={(event) => updateFood('price', event.target.value)} placeholder="350" type="number" min="1" required /></label><label>Category<select value={foodForm.category} onChange={(event) => updateFood('category', event.target.value)}><option>Traditional</option><option>Breakfast</option><option>Fast food</option><option>Drinks & coffee</option><option>Desserts</option></select></label><label className="full-field">Description<textarea value={foodForm.description} onChange={(event) => updateFood('description', event.target.value)} placeholder="Tell customers what makes it special" rows="2" /></label></div><div className="upload-actions"><button className="text-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button small-primary" type="submit" disabled={saving}>{saving ? <><span className="spinner" /> Publishing…</> : <><Check size={15} /> Publish food</>}</button></div></form>}
          {foodItems.length ? <div className="owner-menu-list">{foodItems.map((item) => <div className="owner-menu-row" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.description}</small></div><span>{formatETB(item.price)}</span><button className={`availability-dot ${item.available ? '' : 'off'}`} type="button" onClick={() => toggleFood(item)}>{item.available ? 'Live' : 'Hidden'}</button><button className="icon-button" type="button" onClick={() => toggleFood(item)} aria-label={`Toggle ${item.name}`}><MoreHorizontal size={17} /></button></div>)}</div> : <div className="panel-empty"><Coffee size={24} /><strong>Your menu is empty</strong><span>Add your first dish to get started.</span></div>}
        </section>
        <section className="dashboard-panel owner-orders-panel"><div className="panel-heading"><div><span className="section-kicker">At a glance</span><h2>Partner checklist</h2></div></div><div className="partner-checklist"><div className="checklist-row complete"><CheckCircle2 size={17} /><span><strong>Restaurant profile</strong><small>{restaurant.name}</small></span></div><div className={`checklist-row ${pending ? '' : 'complete'}`}>{pending ? <Clock3 size={17} /> : <CheckCircle2 size={17} />}<span><strong>Admin approval</strong><small>{pending ? 'Waiting for review' : 'Approved and visible'}</small></span></div><div className={`checklist-row ${foodItems.length ? 'complete' : ''}`}>{foodItems.length ? <CheckCircle2 size={17} /> : <Coffee size={17} />}<span><strong>Menu items</strong><small>{foodItems.length ? `${foodItems.length} items published` : 'Add your first dish'}</small></span></div></div><div className="owner-profile-card"><span className="request-avatar mama">{initials(restaurant.name)}</span><div><strong>{restaurant.name}</strong><small>{restaurant.cuisine || 'Local kitchen'} · {restaurant.phone || 'Add a phone number'}</small></div></div></section>
      </div>
    </>
  )
}

function LiveStat({ icon: Icon, label, value, change, tone }) {
  return <div className="dashboard-stat"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><span className="stat-change"><Check size={12} /> {change}</span></div></div>
}

export function LiveDriverDashboard({
  profile,
  availableOrders,
  activeOrder,
  loading,
  createProfile,
  setAvailability,
  acceptOrder,
  updateStatus,
  showToast,
}) {
  const [available, setAvailable] = useState(profile?.is_available || false)
  const [form, setForm] = useState({ vehicleType: 'Motorbike', licenseNumber: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => setAvailable(profile?.is_available || false), [profile?.is_available])

  const submitProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await createProfile(form)
    } catch (error) {
      showToast(error.message || 'Could not submit driver application', 'warning')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !profile) return <div className="live-workspace-loading"><span className="spinner spinner-dark" /><strong>Loading driver workspace…</strong><span>Checking your approval and availability.</span></div>

  if (!profile) {
    return <section className="onboarding-panel"><div className="onboarding-icon"><Bike size={25} /></div><span className="section-kicker">Driver onboarding</span><h2>Keep Adama moving</h2><p>Apply once, get approved by the admin team, and accept delivery orders near you.</p><form className="onboarding-form" onSubmit={submitProfile}><div className="onboarding-form-grid"><label>Vehicle type<select value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}><option>Motorbike</option><option>Bicycle</option><option>Car</option></select></label><label>License number<input value={form.licenseNumber} onChange={(event) => setForm((current) => ({ ...current, licenseNumber: event.target.value }))} placeholder="Optional for now" /></label></div><div className="onboarding-note"><ShieldCheck size={16} /><span>Your application starts as <strong>pending</strong>. You will be able to accept orders after approval.</span></div><button className="primary-button" type="submit" disabled={saving}>{saving ? <><span className="spinner" /> Submitting…</> : <>Submit driver application <ArrowRight size={16} /></>}</button></form></section>
  }

  const pending = profile.approval_status !== 'approved'
  if (pending) return <section className="onboarding-panel"><div className="onboarding-icon pending"><Clock3 size={25} /></div><span className="section-kicker">Application received</span><h2>Your driver application is under review</h2><p>We will let you know when an admin approves your account. Your current status is <strong>pending</strong>.</p><div className="application-status-card"><span className="pending-pill">Pending approval</span><span>{profile.vehicle_type || 'Vehicle not set'}</span></div></section>

  return (
    <>
      <div className="driver-status-banner"><div className="driver-status-copy"><span className={`availability-toggle ${available ? 'online' : ''}`}><i /></span><div><strong>{available ? 'You are online' : 'You are offline'}</strong><small>{available ? 'New orders around you will appear here' : 'Go online when you are ready to deliver'}</small></div></div><button className="status-toggle-button" type="button" onClick={() => { const next = !available; setAvailable(next); setAvailability(next) }}>{available ? 'Go offline' : 'Go online'}</button></div>
      {activeOrder && <section className="active-delivery-card"><div className="active-delivery-top"><div><span className="section-kicker">Active delivery · {activeOrder.displayId}</span><h2>{activeOrder.pickup}</h2><p>{activeOrder.dropoff} · {activeOrder.distance}</p></div><span className="delivery-eta"><Clock3 size={16} /> {activeOrder.eta}</span></div><div className="delivery-route-row"><div className="route-point"><span className="route-dot pickup-dot"><Store size={15} /></span><span><small>Pickup</small><strong>{activeOrder.pickup}</strong></span></div><ArrowRight size={18} /><div className="route-point"><span className="route-dot dropoff-dot"><MapPin size={15} /></span><span><small>Drop off</small><strong>{activeOrder.dropoff}</strong></span></div></div><div className="delivery-status-actions"><button className="outline-button" type="button" onClick={() => updateStatus(activeOrder, 'picked_up')}><Check size={15} /> Picked up</button><button className="primary-button" type="button" onClick={() => updateStatus(activeOrder, 'on_the_way')}><Bike size={15} /> Start delivery</button><button className="primary-button" type="button" onClick={() => updateStatus(activeOrder, 'delivered')}><CheckCircle2 size={15} /> Delivered</button></div></section>}
      <div className="driver-summary-row"><div className="driver-summary-copy"><span className="section-kicker">Your day</span><h2>{availableOrders.length} orders nearby</h2><p>Accept an order only when it fits your route.</p></div><div className="driver-earnings"><span>Today’s deliveries</span><strong>{activeOrder ? 1 : 0}</strong><small>Live from Supabase</small></div></div>
      <section className="dashboard-panel available-orders-panel"><div className="panel-heading"><div><span className="section-kicker">Live nearby orders</span><h2>Available orders</h2></div><span className="live-indicator"><i /> Live</span></div>{availableOrders.length ? <div className="available-order-list">{availableOrders.map((order) => <article className="available-order-card" key={order.id}><div className="available-order-main"><div className="available-order-id"><span className="order-bag-icon"><PackageCheck size={17} /></span><span><strong>{order.displayId}</strong><small>{order.status}</small></span></div><div className="available-route"><div><Store size={14} /><span>{order.pickup}</span></div><div><MapPin size={14} /><span>{order.dropoff}</span></div></div><div className="available-order-meta"><span><Bike size={14} /> {order.distance}</span><span><Clock3 size={14} /> {order.eta}</span></div></div><div className="available-order-side"><strong>{formatETB(order.fee)}</strong><small>delivery fee</small><button className="primary-button small-primary" type="button" onClick={() => acceptOrder(order)}>Accept <Check size={15} /></button></div></article>)}</div> : <div className="panel-empty"><Bike size={24} /><strong>No available orders</strong><span>Keep this page open and new requests will appear here.</span></div>}</section>
    </>
  )
}
