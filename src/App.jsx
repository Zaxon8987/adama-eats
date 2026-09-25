import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  CreditCard,
  ExternalLink,
  Filter,
  Heart,
  Home,
  Languages,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Minus,
  MoreHorizontal,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import {
  approvalRequests,
  availableDriverOrders,
  categories,
  dashboardOrders,
  ownerMenu,
  pastOrders,
  restaurants,
} from './data'
import { createTelebirrPayment, fetchApprovedRestaurants, isSupabaseConfigured, supabase } from './lib/supabase'
import { checkLoginRateLimit, phoneAliasEmail, signUpWithPhone } from './lib/authSecurity'
import { LiveDriverDashboard, LiveOwnerDashboard } from './components/LiveDashboards'
import PhoneAuthModal from './components/PhoneAuthModal'
import PasswordResetModal from './components/PasswordResetModal'
import AccountModal from './components/AccountModal'
import RolePortal from './components/RolePortals'
import {
  acceptDriverOrder as acceptLiveDriverOrder,
  approveDriver as approveLiveDriver,
  approveRestaurant as approveLiveRestaurant,
  createDriverProfile,
  createFoodItem,
  createRestaurant,
  fetchAdminApprovals,
  fetchDriverWorkspace,
  fetchOwnerWorkspace,
  fetchProfile,
  setDriverAvailability,
  updateDriverOrderStatus,
  updateFoodItem,
} from './lib/operations'

const copy = {
  en: {
    discover: 'Discover',
    orders: 'My orders',
    dashboard: 'Dashboard',
    search: 'Search restaurants or dishes',
    viewMenu: 'View menu',
    add: 'Add',
    cart: 'Your cart',
    checkout: 'Go to checkout',
    deliveryTo: 'Delivering to Adama',
    open: 'Open',
  },
  am: {
    discover: 'ይግኝ',
    orders: 'የእኔ ትዕዛዞች',
    dashboard: 'ዳሽቦርድ',
    search: 'ሆቴሎች ወይም ምግቦችን ይፈልጉ',
    viewMenu: 'ምናሌ ይመልከቱ',
    add: 'ጨምር',
    cart: 'የእኔ ዕቃ',
    checkout: 'ወደ ክፍያ ይሂዱ',
    deliveryTo: 'ወደ አዳማ ይደርሳል',
    open: 'ክፈት',
  },
}

const roleLabels = {
  customer: 'Customer view',
  owner: 'Restaurant owner',
  driver: 'Driver view',
  admin: 'Admin view',
}

const orderSteps = ['Payment confirmed', 'Restaurant preparing', 'Driver assigned', 'Out for delivery', 'Delivered']

function formatETB(amount) {
  return `${Number(amount || 0).toLocaleString('en-ET')} ETB`
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function normalizeEthiopianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `+251${digits.slice(1)}`
  if (digits.startsWith('251')) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+251${digits}`
  return value
}

function useStoredCart() {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('adama-eats-cart') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    window.localStorage.setItem('adama-eats-cart', JSON.stringify(cart))
  }, [cart])

  return [cart, setCart]
}

function App() {
  const [language, setLanguage] = useState('en')
  const t = copy[language]
  const [view, setView] = useState('home')
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [catalogRestaurants, setCatalogRestaurants] = useState(restaurants)
  const [cart, setCart] = useStoredCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [role, setRole] = useState('customer')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [toast, setToast] = useState(null)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [ownerItems, setOwnerItems] = useState(ownerMenu)
  const [driverOrders, setDriverOrders] = useState(availableDriverOrders)
  const [activeDriverOrder, setActiveDriverOrder] = useState(null)
  const [approvalItems, setApprovalItems] = useState(approvalRequests)
  const [authOpen, setAuthOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authRole, setAuthRole] = useState('customer')
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' })
  const requestedAccountType = useRef(null)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [accountProfile, setAccountProfile] = useState(null)
  const [ownerWorkspace, setOwnerWorkspace] = useState({ restaurant: null, categories: [], foodItems: [] })
  const [adminApprovals, setAdminApprovals] = useState({ restaurants: [], drivers: [] })
  const [driverWorkspace, setDriverWorkspace] = useState({ profile: null, availableOrders: [], activeOrder: null })
  const [liveLoading, setLiveLoading] = useState(false)

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    const loadUserProfile = async (nextUser) => {
      if (!active) return
      setUser(nextUser || null)
      if (!nextUser) {
        requestedAccountType.current = null
        setAccountProfile(null)
        setRole('customer')
        setView('home')
        return
      }

      try {
        const profile = await fetchProfile(nextUser.id)
        if (!active) return
        setAccountProfile(profile)
        const profileRole = requestedAccountType.current && profile?.role === 'customer'
          ? requestedAccountType.current
          : profile?.role
        if (profileRole) {
          setRole(profileRole)
          setView(profileRole === 'customer' ? 'home' : 'portal')
          window.history.replaceState(null, '', profileRole === 'customer' ? window.location.pathname : `#${profileRole}`)
        }
        requestedAccountType.current = null
      } catch {
        if (active) setAccountProfile(null)
      }
    }

    supabase.auth.getUser().then(({ data }) => loadUserProfile(data.user || null)).catch(() => {})
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserProfile(session?.user || null)
    })
    return () => {
      active = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    fetchApprovedRestaurants()
      .then((liveRestaurants) => {
        if (liveRestaurants.length) setCatalogRestaurants(liveRestaurants)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!supabase || !user || role !== 'owner') return undefined
    let active = true
    setLiveLoading(true)
    fetchOwnerWorkspace(user.id)
      .then((workspace) => {
        if (active) setOwnerWorkspace(workspace)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLiveLoading(false)
      })
    return () => {
      active = false
    }
  }, [accountProfile?.role, role, supabase, user])

  useEffect(() => {
    if (!supabase || !user || accountProfile?.role !== 'admin' || role !== 'admin') return undefined
    let active = true
    setLiveLoading(true)
    fetchAdminApprovals()
      .then((approvals) => {
        if (active) setAdminApprovals(approvals)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLiveLoading(false)
      })
    return () => {
      active = false
    }
  }, [accountProfile?.role, role, supabase, user])

  useEffect(() => {
    if (!supabase || !user || role !== 'driver') return undefined
    let active = true
    setLiveLoading(true)
    fetchDriverWorkspace(user.id)
      .then((workspace) => {
        if (active) setDriverWorkspace(workspace)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLiveLoading(false)
      })
    return () => {
      active = false
    }
  }, [accountProfile?.role, role, supabase, user])

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return catalogRestaurants.filter((restaurant) => {
      const matchesCategory =
        category === 'all' || restaurant.menu.some((item) => item.category === category)
      const matchesSearch =
        !query ||
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.menu.some((item) => item.name.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [catalogRestaurants, category, search])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const deliveryFee = cart[0]?.deliveryFee || 0
  const total = subtotal + deliveryFee

  const showToast = (message, tone = 'success') => setToast({ message, tone })

  const navigate = (nextView) => {
    setView(nextView)
    setSelectedRestaurant(null)
    setMobileMenuOpen(false)
    if (nextView === 'portal' && role !== 'customer') window.history.replaceState(null, '', `#${role}`)
    if (nextView === 'home') window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const syncPortalHash = () => {
      const requested = window.location.hash.replace(/^#\/?/, '').toLowerCase()
      if (!requested || requested === 'customer') return
      if (!['admin', 'owner', 'driver'].includes(requested)) return
      if (user && accountProfile?.role === requested) {
        if (view !== 'portal') navigate('portal')
      } else if (!user) {
        setAuthOpen(true)
      }
    }
    syncPortalHash()
    window.addEventListener('hashchange', syncPortalHash)
    return () => window.removeEventListener('hashchange', syncPortalHash)
  }, [accountProfile?.role, user, view])

  const openRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setView('restaurant')
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addToCart = (item, restaurant) => {
    if (cart.length && cart[0].restaurantId !== restaurant.id) {
      showToast('For a simpler checkout, order from one restaurant at a time.', 'warning')
      return
    }

    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id)
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        )
      }
      return [
        ...current,
        {
          ...item,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          deliveryFee: restaurant.deliveryFee,
        },
      ]
    })
    showToast(`${item.name} added to your cart`)
  }

  const updateQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + amount } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (id) => setCart((current) => current.filter((item) => item.id !== id))

  const changeRole = (nextRole) => {
    setRole(nextRole)
    setMobileMenuOpen(false)
    if (nextRole === 'customer') {
      navigate('home')
    } else {
      navigate('portal')
    }
  }

  const openAccount = () => {
    if (user) setAccountOpen(true)
    else setAuthOpen(true)
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    setAccountOpen(false)
    setAccountProfile(null)
    setUser(null)
    setRole('customer')
    setView('home')
    window.history.replaceState(null, '', window.location.pathname)
    showToast('You have been signed out', 'info')
  }

  const closeAuth = () => {
    setAuthOpen(false)
    setAuthError('')
    setAuthForm({ name: '', phone: '', password: '' })
  }

  const handleAuth = async (form) => {
    setAuthError('')
    setAuthLoading(true)
    const phone = normalizeEthiopianPhone(form.phone)
    let rateLimitAttempted = false

    try {
      if (!supabase) {
        setRole(authRole)
        closeAuth()
        navigate(authRole === 'customer' ? 'home' : 'dashboard')
        showToast(`Demo ${roleLabels[authRole].toLowerCase()} enabled`)
        return
      }

      if (!form.phone || !form.password) throw new Error('Enter your phone number and password.')
      if (authMode === 'signup' && !form.name) throw new Error('Enter your full name.')

      const rateLimit = await checkLoginRateLimit(supabase, phone, 'check')
      if (!rateLimit.allowed) throw new Error(rateLimit.message || 'Too many login attempts. Try again later.')
      rateLimitAttempted = true

      if (authMode === 'signup') {
        requestedAccountType.current = authRole
        await signUpWithPhone(supabase, { phone, password: form.password, name: form.name })
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneAliasEmail(phone),
        password: form.password,
      })
      if (signInError) {
        requestedAccountType.current = null
        throw signInError
      }

      await checkLoginRateLimit(supabase, phone, 'success')
      setRole(authRole)
      closeAuth()
      navigate(authRole === 'customer' ? 'home' : 'dashboard')
      showToast(authMode === 'signup' ? 'Phone account created successfully' : 'Welcome back to Adama Eats')
    } catch (error) {
      if (rateLimitAttempted) await checkLoginRateLimit(supabase, phone, 'failure').catch(() => {})
      setAuthError(error.message || 'Unable to authenticate right now.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePlaceOrder = async (details) => {
    const firstItem = cart[0]
    const liveCheckout = Boolean(supabase && isUuid(firstItem?.restaurantId))

    if (liveCheckout && !user) {
      throw new Error('Please sign in before placing a live order.')
    }

    let remoteOrder = null
    let payment = { demo: true, transactionId: `DEMO-${Date.now()}` }

    if (liveCheckout) {
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          restaurant_id: firstItem.restaurantId,
          status: 'pending_payment',
          fulfillment_type: 'delivery',
          subtotal,
          delivery_fee: deliveryFee,
          total,
          delivery_address: details.address,
          delivery_phone: details.phone,
          customer_note: details.notes || null,
        })
        .select('id, order_number')
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase.from('order_items').insert(cart.map((item) => ({
        order_id: orderRow.id,
        food_item_id: isUuid(item.id) ? item.id : null,
        item_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
      })))
      if (itemsError) throw itemsError

      remoteOrder = orderRow
      payment = await createTelebirrPayment({ orderId: orderRow.id, amount: total, currency: 'ETB' })
    } else if (!supabase) {
      payment = await createTelebirrPayment({ orderId: `demo-${Date.now()}`, amount: total, currency: 'ETB' })
    }

    const paidInDemo = payment?.demo || payment?.status === 'paid_demo'
    const newOrder = {
      id: remoteOrder ? `AE-${remoteOrder.order_number}` : `AE-${Math.floor(1052 + Math.random() * 80)}`,
      customer: details.name || user?.user_metadata?.full_name || 'Adama Eats customer',
      restaurantName: firstItem?.restaurantName || 'Your restaurant',
      phone: details.phone,
      address: details.address,
      notes: details.notes,
      items: cart.map((item) => ({ ...item })),
      subtotal,
      deliveryFee,
      total,
      payment: 'Telebirr',
      paymentTransactionId: payment?.transactionId,
      paymentStatus: paidInDemo ? 'Paid in demo mode' : 'Payment pending',
      statusIndex: paidInDemo ? 1 : 0,
      placedAt: 'Just now',
      driver: null,
    }

    setCurrentOrder(newOrder)
    setCart([])
    setCheckoutOpen(false)
    setCartOpen(false)
    navigate('orders')
    showToast(remoteOrder ? 'Order placed — your restaurant is getting started!' : 'Demo order placed successfully!')
  }

  const addOwnerFood = (food) => {
    setOwnerItems((current) => [food, ...current])
    showToast(`${food.name} added to your menu`)
  }

  const acceptDriverOrder = (order) => {
    setDriverOrders((current) => current.filter((entry) => entry.id !== order.id))
    setActiveDriverOrder(order)
    showToast(`${order.id} accepted — head to ${order.pickup}`)
  }

  const approveRequest = (id) => {
    const request = approvalItems.find((item) => item.id === id)
    setApprovalItems((current) => current.filter((item) => item.id !== id))
    showToast(`${request?.name || 'Account'} approved`)
  }

  const handleApproveRequest = async (request, approved = true) => {
    const liveAdmin = Boolean(user && accountProfile?.role === 'admin' && role === 'admin')
    if (!liveAdmin) {
      approveRequest(request.id)
      return
    }

    try {
      if (request.type === 'Driver') {
        await approveLiveDriver(request.id, approved)
      } else {
        await approveLiveRestaurant(request.id, request.ownerId, approved)
      }
      const nextApprovals = await fetchAdminApprovals()
      setAdminApprovals(nextApprovals)
      showToast(approved ? `${request.name} approved` : `${request.name} rejected`)
    } catch (error) {
      showToast(error.message || 'Could not update this request', 'warning')
    }
  }

  const handleCreateRestaurant = async (form) => {
    if (!supabase || !user) throw new Error('Sign in to register a restaurant.')
    const restaurant = await createRestaurant({ userId: user.id, ...form })
    setOwnerWorkspace((current) => ({ ...current, restaurant }))
    showToast('Restaurant application submitted for admin approval')
    return restaurant
  }

  const handleAddOwnerFood = async (form, file) => {
    if (!supabase || !user || !ownerWorkspace.restaurant) {
      addOwnerFood({
        id: `owner-${Date.now()}`,
        name: form.name,
        price: Number(form.price),
        description: form.description || 'A new favorite from your kitchen.',
        category: form.category,
        image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=82',
        popular: false,
      })
      return
    }

    try {
      const food = await createFoodItem({ userId: user.id, restaurantId: ownerWorkspace.restaurant.id, form, file })
      setOwnerWorkspace((current) => ({ ...current, foodItems: [food, ...current.foodItems] }))
      showToast(`${food.name} added to your menu`)
    } catch (error) {
      showToast(error.message || 'Could not add this food item', 'warning')
      throw error
    }
  }

  const handleToggleOwnerFood = async (item) => {
    if (!supabase || !user || !ownerWorkspace.restaurant || !isUuid(item.id)) return
    try {
      const updated = await updateFoodItem(item.id, { is_available: !item.available })
      setOwnerWorkspace((current) => ({
        ...current,
        foodItems: current.foodItems.map((entry) => (entry.id === item.id ? updated : entry)),
      }))
      showToast(updated.available ? 'Food item is now available' : 'Food item hidden from the menu')
    } catch (error) {
      showToast(error.message || 'Could not update this food item', 'warning')
    }
  }

  const handleCreateDriverProfile = async (form) => {
    if (!supabase || !user) throw new Error('Sign in to apply as a driver.')
    const profile = await createDriverProfile({ userId: user.id, ...form })
    setDriverWorkspace((current) => ({ ...current, profile }))
    showToast('Driver application submitted for admin approval')
    return profile
  }

  const handleSetDriverAvailability = async (isAvailable) => {
    if (!supabase || !user || !driverWorkspace.profile) {
      showToast(isAvailable ? 'Demo driver is online' : 'Demo driver is offline', 'info')
      return
    }
    try {
      const profile = await setDriverAvailability(user.id, isAvailable)
      setDriverWorkspace((current) => ({ ...current, profile }))
      showToast(isAvailable ? 'You are now online' : 'You are now offline')
    } catch (error) {
      showToast(error.message || 'Could not update availability', 'warning')
    }
  }

  const handleAcceptDriverOrder = async (order) => {
    if (!supabase || !user || !driverWorkspace.profile) {
      acceptDriverOrder(order)
      return
    }
    try {
      await acceptLiveDriverOrder(order.id)
      setDriverWorkspace((current) => ({
        ...current,
        availableOrders: current.availableOrders.filter((entry) => entry.id !== order.id),
        activeOrder: { ...order, status: 'assigned' },
      }))
      showToast(`${order.displayId || order.id} accepted`)
    } catch (error) {
      showToast(error.message || 'This order is no longer available', 'warning')
    }
  }

  const handleUpdateDriverStatus = async (order, status) => {
    if (!supabase || !user || !driverWorkspace.profile) {
      showToast('Demo delivery status updated', 'info')
      return
    }
    try {
      await updateDriverOrderStatus(order.id, status)
      setDriverWorkspace((current) => ({ ...current, activeOrder: current.activeOrder ? { ...current.activeOrder, status } : null }))
      showToast('Delivery status updated')
    } catch (error) {
      showToast(error.message || 'Could not update delivery status', 'warning')
    }
  }

  const liveOwner = Boolean(supabase && user && role === 'owner')
  const liveAdmin = Boolean(supabase && user && accountProfile?.role === 'admin' && role === 'admin')
  const liveDriver = Boolean(supabase && user && role === 'driver')
  const liveApprovalItems = liveAdmin ? [...adminApprovals.restaurants, ...adminApprovals.drivers] : approvalItems

  return (
    <div className="app-shell">
      {view !== 'portal' && (
        <>
          <Header
            t={t}
            language={language}
            setLanguage={setLanguage}
            role={role}
            cartCount={cartCount}
            setCartOpen={setCartOpen}
            onAccount={openAccount}
            user={user}
            view={view}
            navigate={navigate}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            onBell={() => showToast('You are all caught up', 'info')}
          />

          <div className={`connection-banner ${isSupabaseConfigured ? 'connected' : ''}`}>
            <div className="connection-inner">
              <span className="connection-dot" />
              <span>
                {isSupabaseConfigured ? 'Supabase connected' : 'Preview mode · connect Supabase when you are ready'}
              </span>
              <button type="button" onClick={() => setAuthOpen(true)}>
                {isSupabaseConfigured ? 'Manage account' : 'Connect account'} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <main className={view === 'portal' ? 'portal-page' : 'page-container'}>
        {view === 'home' && (
          <HomeView
            t={t}
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            restaurants={filteredRestaurants}
            openRestaurant={openRestaurant}
            setAuthOpen={setAuthOpen}
          />
        )}

        {view === 'restaurant' && selectedRestaurant && (
          <RestaurantView
            t={t}
            restaurant={selectedRestaurant}
            onBack={() => navigate('home')}
            addToCart={addToCart}
          />
        )}

        {view === 'orders' && <OrdersView order={currentOrder} navigate={navigate} />}

        {view === 'portal' && (
          <RolePortal
            role={role}
            user={user}
            profile={accountProfile}
            ownerWorkspace={ownerWorkspace}
            ownerItems={ownerItems}
            addOwnerFood={addOwnerFood}
            createRestaurant={handleCreateRestaurant}
            addOwnerFoodItem={handleAddOwnerFood}
            toggleOwnerFood={handleToggleOwnerFood}
            driverWorkspace={driverWorkspace}
            createDriverProfile={handleCreateDriverProfile}
            setDriverAvailability={handleSetDriverAvailability}
            acceptDriverOrder={handleAcceptDriverOrder}
            updateDriverStatus={handleUpdateDriverStatus}
            approvalItems={liveApprovalItems}
            approveRequest={handleApproveRequest}
            liveAdmin={liveAdmin}
            liveOwner={liveOwner}
            liveDriver={liveDriver}
            liveLoading={liveLoading}
            showToast={showToast}
            navigate={navigate}
            onAccount={openAccount}
          />
        )}
      </main>

      {view === 'home' && <Footer navigate={navigate} />}

      <CartDrawer
        open={cartOpen}
        setOpen={setCartOpen}
        cart={cart}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        onCheckout={() => {
          setCartOpen(false)
          setCheckoutOpen(true)
        }}
        t={t}
      />

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handlePlaceOrder}
        />
      )}

      {authOpen && (
        <PhoneAuthModal
          mode={authMode}
          setMode={setAuthMode}
          form={authForm}
          setForm={setAuthForm}
          role={authRole}
          setRole={setAuthRole}
          onReset={() => { setAuthOpen(false); setResetOpen(true) }}
          onClose={closeAuth}
          onSubmit={handleAuth}
          loading={authLoading}
          error={authError}
        />
      )}

      {resetOpen && <PasswordResetModal onClose={() => setResetOpen(false)} showToast={showToast} />}
      {accountOpen && user && <AccountModal user={user} profile={accountProfile} onClose={() => setAccountOpen(false)} onVerified={() => fetchProfile(user.id).then(setAccountProfile).catch(() => {})} onSignOut={signOut} showToast={showToast} />}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function Header({
  t,
  language,
  setLanguage,
  role,
  cartCount,
  setCartOpen,
  onAccount,
  user,
  view,
  navigate,
  mobileMenuOpen,
  setMobileMenuOpen,
  onBell,
}) {
  const isPartner = Boolean(user && role !== 'customer')

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="Adama Eats home">
          <span className="brand-mark">ae</span>
          <span className="brand-word">adama<span>eats</span></span>
        </button>

        <button className="location-pill" type="button">
          <MapPin size={16} />
          <span>Adama</span>
          <ChevronDown size={14} />
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={view === 'home' || view === 'restaurant' ? 'active' : ''} type="button" onClick={() => navigate('home')}>
            {t.discover}
          </button>
          <button className={view === 'orders' ? 'active' : ''} type="button" onClick={() => navigate('orders')}>
            {t.orders}
          </button>
          {isPartner && (
            <button className={view === 'portal' ? 'active' : ''} type="button" onClick={() => navigate('portal')}>
              Open portal
            </button>
          )}
        </nav>

        <div className="header-actions">
          {isPartner && <button className="header-portal-button" type="button" onClick={() => navigate('portal')}><LayoutDashboard size={15} /> Open portal</button>}
          <button className="language-button" type="button" onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}>
            <Languages size={16} />
            {language.toUpperCase()}
          </button>
          <button className="icon-button notification-button" type="button" onClick={onBell} aria-label="Notifications">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
          <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} />
            <span className="cart-button-label">Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>
          <button className="avatar-button" type="button" onClick={onAccount} aria-label="Account">
            {user?.user_metadata?.full_name ? user.user_metadata.full_name.slice(0, 1).toUpperCase() : <UserRound size={17} />}
          </button>
          <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav">
          <button type="button" onClick={() => navigate('home')}>Discover</button>
          <button type="button" onClick={() => navigate('orders')}>My orders</button>
          {isPartner && <button type="button" onClick={() => navigate('portal')}>Open partner portal</button>}
          <button type="button" onClick={onAccount}>{user ? 'My account' : 'Sign in / Create account'}</button>
          <div className="mobile-nav-divider" />
        </div>
      )}
    </header>
  )
}

function HomeView({ t, search, setSearch, category, setCategory, restaurants: visibleRestaurants, openRestaurant, setAuthOpen }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Adama's table, delivered</div>
          <h1>Good food.<br /><em>Right on time.</em></h1>
          <p>From a warm cup of buna to a full family feast, discover the best of Adama from the places you already love.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore restaurants <ArrowRight size={17} />
            </button>
            <button className="text-button" type="button" onClick={() => setAuthOpen(true)}>
              Become a partner <ChevronRight size={16} />
            </button>
          </div>
          <div className="hero-trust">
            <div className="avatar-stack"><span>MA</span><span>YK</span><span>HG</span><span>+</span></div>
            <div><strong>Loved by Adama</strong><small>4.9 average from hungry locals</small></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-frame">
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1100&q=85" alt="A table filled with colorful food" />
          </div>
          <div className="hero-float-card hero-float-top">
            <span className="float-icon"><Clock3 size={17} /></span>
            <span><strong>25 min</strong><small>average delivery</small></span>
          </div>
          <div className="hero-float-card hero-float-bottom">
            <span className="float-icon float-icon-orange"><Sparkles size={17} /></span>
            <span><strong>Made with care</strong><small>Local favorites, every day</small></span>
          </div>
          <div className="hero-stamp"><span>made for</span><strong>Adama</strong><span>with love</span></div>
        </div>
      </section>

      <section className="search-section" id="restaurants">
        <div className="search-panel">
          <div className="search-input-wrap"><Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} /></div>
          <button className="search-button" type="button" onClick={() => document.getElementById('restaurant-grid')?.scrollIntoView({ behavior: 'smooth' })}>Search</button>
          <button className="filter-button" type="button"><Filter size={18} /><span>Filters</span></button>
        </div>
        <div className="category-row">
          {categories.map((item) => (
            <button key={item.id} className={`category-chip ${category === item.id ? 'selected' : ''}`} type="button" onClick={() => setCategory(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="section-kicker">Curated for you</span><h2>Popular near you</h2></div>
          <button className="outline-button" type="button" onClick={() => { setSearch(''); setCategory('all') }}>See all <ArrowRight size={16} /></button>
        </div>
        {visibleRestaurants.length ? (
          <div className="restaurant-grid" id="restaurant-grid">
            {visibleRestaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} onOpen={openRestaurant} t={t} />)}
          </div>
        ) : (
          <div className="empty-state"><Search size={25} /><h3>No restaurants found</h3><p>Try a different search or category.</p></div>
        )}
      </section>

      <section className="promo-section">
        <div className="promo-copy"><span className="promo-label"><Sparkles size={14} /> Adama Eats promise</span><h2>More than a delivery.<br /><em>A little more home.</em></h2><p>Every order supports a local kitchen, a real driver, and a neighbor who wanted to eat well today.</p><button className="light-button" type="button" onClick={() => setAuthOpen(true)}>Join the community <ArrowRight size={16} /></button></div>
        <div className="promo-art"><div className="promo-circle" /><div className="promo-plate"><span>AE</span></div><div className="promo-spark spark-one">✦</div><div className="promo-spark spark-two">✧</div><div className="promo-spark spark-three">✦</div></div>
      </section>
    </>
  )
}

function RestaurantCard({ restaurant, onOpen, t }) {
  const [liked, setLiked] = useState(false)
  return (
    <article className="restaurant-card">
      <button className="restaurant-image-button" type="button" onClick={() => onOpen(restaurant)} aria-label={`Open ${restaurant.name}`}>
        <img src={restaurant.image} alt={restaurant.name} />
        <span className="image-shade" />
        <span className="restaurant-badge">{restaurant.badge}</span>
        <span className="distance-badge"><MapPin size={12} /> {restaurant.distance}</span>
      </button>
      <button className={`heart-button ${liked ? 'liked' : ''}`} type="button" onClick={() => setLiked(!liked)} aria-label="Save restaurant"><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button>
      <div className="restaurant-card-body">
        <div className="restaurant-title-row"><div><h3>{restaurant.name}</h3><p>{restaurant.cuisine}</p></div><span className={`restaurant-logo ${restaurant.logoClass}`}>{restaurant.logo}</span></div>
        <div className="restaurant-meta"><span className="rating"><Star size={14} fill="currentColor" /> {restaurant.rating}</span><span><Clock3 size={14} /> {restaurant.eta}</span><span><Bike size={14} /> {formatETB(restaurant.deliveryFee)}</span></div>
        <button className="card-cta" type="button" onClick={() => onOpen(restaurant)}>{t.viewMenu} <ChevronRight size={16} /></button>
      </div>
    </article>
  )
}

function RestaurantView({ t, restaurant, onBack, addToCart }) {
  const [menuCategory, setMenuCategory] = useState('all')
  const menuCategories = ['all', ...new Set(restaurant.menu.map((item) => item.category))]
  const visibleItems = menuCategory === 'all' ? restaurant.menu : restaurant.menu.filter((item) => item.category === menuCategory)

  return (
    <div className="restaurant-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to restaurants</button>
      <section className="restaurant-hero-panel">
        <div className="restaurant-hero-image"><img src={restaurant.image} alt={restaurant.name} /><span className="image-shade" /></div>
        <div className="restaurant-hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> {restaurant.badge}</div>
          <h1>{restaurant.name}</h1>
          <p>{restaurant.description}</p>
          <div className="restaurant-hero-meta"><span className="rating"><Star size={15} fill="currentColor" /> {restaurant.rating} <small>({restaurant.reviews})</small></span><span><Clock3 size={16} /> {restaurant.eta}</span><span><Bike size={16} /> {formatETB(restaurant.deliveryFee)} delivery</span></div>
          <div className="restaurant-hero-actions"><button className="primary-button" type="button" onClick={() => document.getElementById('menu-grid')?.scrollIntoView({ behavior: 'smooth' })}>Browse menu <ArrowRight size={16} /></button><button className="round-action" type="button"><Heart size={18} /></button></div>
        </div>
      </section>

      <section className="menu-section" id="menu-grid">
        <div className="menu-heading"><div><span className="section-kicker">Made fresh for you</span><h2>Popular on the menu</h2></div><div className="menu-note"><Timer size={16} /> Usually ready in {restaurant.eta}</div></div>
        <div className="menu-tabs">{menuCategories.map((item) => <button key={item} className={menuCategory === item ? 'active' : ''} type="button" onClick={() => setMenuCategory(item)}>{item === 'all' ? 'All dishes' : item.replace('-', ' ')}</button>)}</div>
        <div className="food-grid">{visibleItems.map((item) => <FoodCard key={item.id} item={item} onAdd={() => addToCart(item, restaurant)} t={t} />)}</div>
      </section>
    </div>
  )
}

function FoodCard({ item, onAdd, t }) {
  return (
    <article className="food-card">
      <div className="food-image-wrap"><img src={item.image} alt={item.name} />{item.popular && <span className="popular-pill"><Sparkles size={12} /> Popular</span>}<button className="food-heart" type="button" aria-label="Save dish"><Heart size={15} /></button></div>
      <div className="food-card-body"><div className="food-card-top"><div><h3>{item.name}</h3><p>{item.description}</p></div><strong>{formatETB(item.price)}</strong></div><button className="add-button" type="button" onClick={onAdd}><Plus size={16} /> {t.add}</button></div>
    </article>
  )
}

function CartDrawer({ open, setOpen, cart, subtotal, deliveryFee, total, updateQuantity, removeFromCart, onCheckout, t }) {
  if (!open) return null
  return (
    <div className="drawer-layer" onClick={() => setOpen(false)}>
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><span className="section-kicker">Your order</span><h2>{t.cart}</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close cart"><X size={19} /></button></div>
        {cart.length === 0 ? (
          <div className="cart-empty"><div className="empty-basket"><ShoppingBag size={28} /></div><h3>Your cart is waiting</h3><p>Add something delicious from a local kitchen to get started.</p><button className="primary-button" type="button" onClick={() => setOpen(false)}>Browse restaurants <ArrowRight size={16} /></button></div>
        ) : (
          <>
            <div className="cart-restaurant"><span className="mini-restaurant-mark">ae</span><span><strong>{cart[0].restaurantName}</strong><small>Delivering to Adama</small></span><ChevronRight size={16} /></div>
            <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div className="cart-item-info"><strong>{item.name}</strong><small>{formatETB(item.price)}</small><div className="quantity-control"><button type="button" onClick={() => updateQuantity(item.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)}><Plus size={13} /></button></div></div><button className="remove-item" type="button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div>)}</div>
            <div className="cart-summary"><div><span>Subtotal</span><strong>{formatETB(subtotal)}</strong></div><div><span>Delivery</span><strong>{deliveryFee ? formatETB(deliveryFee) : 'Free'}</strong></div><div className="summary-total"><span>Total</span><strong>{formatETB(total)}</strong></div><button className="primary-button full-button" type="button" onClick={onCheckout}>{t.checkout} <ArrowRight size={17} /></button><p className="secure-note"><ShieldCheck size={14} /> Secure checkout with Telebirr</p></div>
          </>
        )}
      </aside>
    </div>
  )
}

function CheckoutModal({ cart, subtotal, deliveryFee, total, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.phone || !form.address) {
      setError('Please add your name, phone number, and delivery address.')
      return
    }
    setError('')
    setProcessing(true)
    try {
      await onConfirm(form)
    } catch (submitError) {
      setError(submitError.message || 'We could not start the payment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><span className="section-kicker">Almost there</span><h2>Checkout</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close checkout"><X size={19} /></button></div>
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={submit}>
            <div className="form-section"><div className="form-section-title"><span className="step-number">1</span><div><strong>Delivery details</strong><small>Where should we bring it?</small></div></div><label>Full name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></label><label>Phone number<input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="09xx xxx xxx" inputMode="tel" /></label><label>Delivery address<textarea value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="House, street, or landmark in Adama" rows="3" /></label><label>Note for the driver <span className="optional">Optional</span><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Landmark, gate, or special request" rows="2" /></label></div>
            <div className="form-section"><div className="form-section-title"><span className="step-number">2</span><div><strong>Payment method</strong><small>Pay securely from your phone</small></div></div><div className="payment-option selected"><span className="telebirr-logo">ቲ</span><span><strong>Telebirr</strong><small>Mobile wallet · Instant confirmation</small></span><CheckCircle2 size={19} /></div><div className="payment-demo-note"><ShieldCheck size={16} /><span>Demo mode is active. Connect your Telebirr merchant credentials before accepting real payments.</span></div></div>
            {error && <div className="form-error"><AlertCircle size={16} /> {error}</div>}
            <button className="primary-button full-button checkout-submit" type="submit" disabled={processing}>{processing ? <><span className="spinner" /> Preparing secure payment…</> : <>Pay {formatETB(total)} with Telebirr <ArrowRight size={17} /></>}</button>
            <p className="secure-note centered"><ShieldCheck size={14} /> Your payment details are never stored in the browser.</p>
          </form>
          <aside className="order-summary"><span className="section-kicker">Your order</span><h3>{cart[0]?.restaurantName || 'Your selection'}</h3><div className="summary-items">{cart.map((item) => <div className="summary-line" key={item.id}><span>{item.quantity} × {item.name}</span><strong>{formatETB(item.price * item.quantity)}</strong></div>)}</div><div className="summary-rule" /><div className="summary-line"><span>Subtotal</span><strong>{formatETB(subtotal)}</strong></div><div className="summary-line"><span>Delivery</span><strong>{formatETB(deliveryFee)}</strong></div><div className="summary-line summary-total"><span>Total</span><strong>{formatETB(total)}</strong></div><div className="summary-promise"><span className="promise-icon"><Sparkles size={15} /></span><p><strong>Good to know</strong>Your order supports a local restaurant and driver in Adama.</p></div></aside>
        </div>
      </div>
    </div>
  )
}

function OrdersView({ order, navigate }) {
  return (
    <div className="orders-page">
      <div className="page-heading-row"><div><span className="section-kicker">Stay in the loop</span><h1>Your orders</h1><p>Track what is cooking and what is on the way.</p></div><button className="outline-button" type="button" onClick={() => navigate('home')}>Order again <ArrowRight size={16} /></button></div>
      {order ? <ActiveOrderCard order={order} /> : <div className="orders-empty"><div className="empty-basket"><PackageCheck size={29} /></div><h2>No active orders</h2><p>Your next delicious delivery is a few taps away.</p><button className="primary-button" type="button" onClick={() => navigate('home')}>Find something delicious <ArrowRight size={16} /></button></div>}
      <section className="past-orders"><div className="section-heading"><div><span className="section-kicker">Your history</span><h2>Past orders</h2></div></div><div className="past-order-list">{pastOrders.map((pastOrder) => <div className="past-order-row" key={pastOrder.id}><span className="past-order-mark"><Utensils size={17} /></span><div><strong>{pastOrder.restaurant}</strong><small>{pastOrder.items}</small></div><span className="past-order-date">{pastOrder.date}</span><strong className="past-order-total">{formatETB(pastOrder.total)}</strong><span className="status-pill delivered"><Check size={13} /> {pastOrder.status}</span><button className="icon-button" type="button" aria-label="Order options"><MoreHorizontal size={18} /></button></div>)}</div></section>
    </div>
  )
}

function ActiveOrderCard({ order }) {
  return (
    <section className="active-order-card">
      <div className="active-order-top"><div><span className="status-pill preparing"><span className="status-pulse" /> {order.paymentStatus}</span><h2>{order.restaurantName || 'Your restaurant'}</h2><p>Order <strong>{order.id}</strong> · placed {order.placedAt}</p></div><div className="active-order-total"><small>Total</small><strong>{formatETB(order.total)}</strong></div></div>
      <div className="tracking-layout"><div className="tracking-map"><div className="map-grid" /><div className="map-route"><span className="route-start"><Home size={15} /></span><span className="route-line" /><span className="route-end"><MapPin size={16} /></span></div><div className="map-label map-label-start">Restaurant</div><div className="map-label map-label-end">Your address</div><div className="map-driver"><Bike size={17} /></div></div><div className="tracking-steps">{orderSteps.map((step, index) => <div className={`tracking-step ${index <= order.statusIndex ? 'complete' : ''} ${index === order.statusIndex ? 'current' : ''}`} key={step}><span className="step-marker">{index < order.statusIndex ? <Check size={13} /> : index === order.statusIndex ? <span className="step-current-dot" /> : index + 1}</span><div><strong>{step}</strong><small>{index === 0 ? 'Payment secured with Telebirr' : index === 1 ? 'The kitchen is preparing your order' : index === 2 ? 'We will notify you when a driver accepts' : index === 3 ? 'Your driver is on the way' : 'Enjoy your meal'}</small></div></div>)}</div></div>
      <div className="active-order-footer"><div className="delivery-address"><span className="footer-icon"><MapPin size={16} /></span><span><small>Delivering to</small><strong>{order.address}</strong></span></div><div className="order-contact"><Phone size={15} /> Need help? <strong>Contact support</strong></div></div>
    </section>
  )
}

function DashboardView({
  role,
  navigate,
  ownerItems,
  addOwnerFood,
  ownerWorkspace,
  createRestaurant,
  addOwnerFoodItem,
  toggleOwnerFood,
  driverOrders,
  activeDriverOrder,
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
}) {
  const meta = {
    admin: { kicker: 'Platform control center', title: 'Good morning, admin', subtitle: 'Here is what is happening across Adama Eats today.', icon: LayoutDashboard },
    owner: { kicker: 'Restaurant partner', title: liveOwner && ownerWorkspace.restaurant ? ownerWorkspace.restaurant.name : 'Buna Kitchen', subtitle: 'Keep your menu fresh and your neighbors happy.', icon: Store },
    driver: { kicker: 'Driver hub', title: 'Ready when you are, driver', subtitle: 'Pick up nearby orders and keep Adama moving.', icon: Bike },
  }[role]
  const Icon = meta.icon
  const visibleOwnerItems = liveOwner ? ownerWorkspace.foodItems : ownerItems
  const visibleDriverOrders = liveDriver ? driverWorkspace.availableOrders : driverOrders
  const visibleActiveOrder = liveDriver ? driverWorkspace.activeOrder : activeDriverOrder

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> {meta.kicker}</div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div><div className="dashboard-heading-actions"><button className="outline-button" type="button" onClick={() => navigate('home')}><ExternalLink size={15} /> View storefront</button><button className="primary-button" type="button" onClick={() => showToast(role === 'owner' ? 'Use the menu panel below to add food' : 'Dashboard actions are ready', 'info')}><Plus size={16} /> {role === 'owner' ? 'Add food' : 'Quick action'}</button></div></div>
      {liveLoading && <div className="live-loading-banner"><span className="spinner spinner-dark" /> Syncing your live workspace…</div>}
      {role === 'admin' && <AdminDashboard approvalItems={approvalItems} approveRequest={approveRequest} live={liveAdmin} showToast={showToast} />}
      {role === 'owner' && (liveOwner
        ? <LiveOwnerDashboard restaurant={ownerWorkspace.restaurant} foodItems={visibleOwnerItems} loading={liveLoading} createRestaurant={createRestaurant} addFood={addOwnerFoodItem} toggleFood={toggleOwnerFood} showToast={showToast} />
        : <OwnerDashboard ownerItems={visibleOwnerItems} addOwnerFood={addOwnerFood} showToast={showToast} />)}
      {role === 'driver' && (liveDriver
        ? <LiveDriverDashboard profile={driverWorkspace.profile} availableOrders={visibleDriverOrders} activeOrder={visibleActiveOrder} loading={liveLoading} createProfile={createDriverProfile} setAvailability={setDriverAvailability} acceptOrder={acceptDriverOrder} updateStatus={updateDriverStatus} showToast={showToast} />
        : <DriverDashboard driverOrders={visibleDriverOrders} activeDriverOrder={visibleActiveOrder} acceptDriverOrder={acceptDriverOrder} showToast={showToast} />)}
      {role === 'customer' && <div className="dashboard-placeholder"><Icon size={28} /><h2>Customer dashboard is coming next</h2><p>Use the role selector to preview the admin, restaurant owner, or driver workspace.</p></div>}
    </div>
  )
}

function DashboardStat({ icon: Icon, label, value, change, tone }) {
  return <div className="dashboard-stat"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><span className="stat-change"><TrendingUp size={12} /> {change}</span></div></div>
}

function AdminDashboard({ approvalItems, approveRequest, live, showToast }) {
  return (
    <>
      <div className="dashboard-stat-grid"><DashboardStat icon={CircleDollarSign} label="Today's sales" value="ETB 18,420" change="12.8%" tone="green" /><DashboardStat icon={ShoppingBag} label="Active orders" value="24" change="8.4%" tone="orange" /><DashboardStat icon={Store} label="Live restaurants" value="18" change="3 new" tone="blue" /><DashboardStat icon={Users} label="Active drivers" value="11" change="2 online" tone="purple" /></div>
      <div className="dashboard-columns admin-columns"><section className="dashboard-panel approval-panel"><div className="panel-heading"><div><span className="section-kicker">Needs your attention</span><h2>Approval requests <span className="count-badge">{approvalItems.length}</span></h2></div><button className="icon-button" type="button" onClick={() => showToast('Showing all approval requests', 'info')}><MoreHorizontal size={18} /></button></div>{approvalItems.length ? <div className="approval-list">{approvalItems.map((request) => <div className="approval-row" key={request.id}><span className={`request-avatar ${request.tone}`}>{request.initials}</span><div className="request-info"><strong>{request.name}</strong><small>{request.type} · {request.detail}</small></div><span className="pending-pill">Pending</span><button className="small-outline-button" type="button" onClick={() => live ? approveRequest(request, false) : showToast('Demo review opened', 'info')}>{live ? 'Reject' : 'Review'}</button><button className="approve-button" type="button" onClick={() => approveRequest(request, true)} aria-label={`Approve ${request.name}`}><Check size={15} /></button></div>)}</div> : <div className="panel-empty"><CheckCircle2 size={23} /><strong>All caught up</strong><span>No pending approvals right now.</span></div>}</section><section className="dashboard-panel performance-panel"><div className="panel-heading"><div><span className="section-kicker">Last 7 days</span><h2>Order activity</h2></div><button className="date-select" type="button">This week <ChevronDown size={14} /></button></div><div className="fake-chart"><div className="chart-y-labels"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart-area"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 500 180" preserveAspectRatio="none" aria-label="Orders trend"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2e8063" stopOpacity=".25" /><stop offset="100%" stopColor="#2e8063" stopOpacity="0" /></linearGradient></defs><path d="M0 150 C30 146 35 120 66 126 S100 112 125 118 S160 80 188 99 S225 92 250 100 S278 48 310 72 S348 55 375 62 S408 26 438 45 S472 22 500 30 L500 180 L0 180 Z" fill="url(#chartFill)" /><path d="M0 150 C30 146 35 120 66 126 S100 112 125 118 S160 80 188 99 S225 92 250 100 S278 48 310 72 S348 55 375 62 S408 26 438 45 S472 22 500 30" fill="none" stroke="#2e8063" strokeWidth="3" strokeLinecap="round" /></svg><div className="chart-x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div></section></div>
      <section className="dashboard-panel recent-orders-panel"><div className="panel-heading"><div><span className="section-kicker">Live feed</span><h2>Recent orders</h2></div><button className="outline-button" type="button" onClick={() => showToast('Full order history is coming next', 'info')}>View all <ArrowRight size={15} /></button></div><OrderTable /></section>
    </>
  )
}

function OrderTable() {
  return <div className="order-table"><div className="order-table-head"><span>Order</span><span>Customer</span><span>Restaurant</span><span>Total</span><span>Status</span><span /></div>{dashboardOrders.map((order) => <div className="order-table-row" key={order.id}><strong>{order.id}</strong><span>{order.customer}</span><span>{order.restaurant}</span><strong>{formatETB(order.total)}</strong><span className={`status-pill ${order.tone}`}>{order.status}</span><button className="icon-button" type="button" aria-label={`More options for ${order.id}`}><MoreHorizontal size={17} /></button></div>)}</div>
}

function OwnerDashboard({ ownerItems, addOwnerFood, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', description: '', category: 'traditional' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.name || !form.price) return
    addOwnerFood({ id: `owner-${Date.now()}`, name: form.name, price: Number(form.price), description: form.description || 'A new favorite from your kitchen.', category: form.category, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=82', popular: false })
    setForm({ name: '', price: '', description: '', category: 'traditional' })
    setShowForm(false)
  }
  return (
    <>
      <div className="dashboard-stat-grid"><DashboardStat icon={ShoppingBag} label="Orders today" value="18" change="14.2%" tone="green" /><DashboardStat icon={CircleDollarSign} label="Today's sales" value="ETB 6,240" change="9.8%" tone="orange" /><DashboardStat icon={Clock3} label="Avg. prep time" value="18 min" change="2 min faster" tone="blue" /><DashboardStat icon={Star} label="Your rating" value="4.9" change="Top 5%" tone="purple" /></div>
      <div className="dashboard-columns owner-columns"><section className="dashboard-panel menu-management-panel"><div className="panel-heading"><div><span className="section-kicker">Your menu</span><h2>Food items <span className="count-badge">{ownerItems.length}</span></h2></div><button className="primary-button small-primary" type="button" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Add food</button></div>{showForm && <form className="food-upload-form" onSubmit={submit}><div className="upload-dropzone"><Upload size={20} /><strong>Drop a food photo here</strong><span>JPG or PNG · up to 5 MB</span><label className="upload-button">Choose image<input type="file" accept="image/png,image/jpeg" onChange={() => showToast('Photo selected for upload', 'info')} /></label></div><div className="upload-fields"><label>Food name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Lamb tibs" required /></label><label>Price (ETB)<input value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="350" type="number" min="1" required /></label><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}><option value="traditional">Traditional</option><option value="breakfast">Breakfast</option><option value="fast-food">Fast food</option><option value="drinks">Drinks & coffee</option></select></label><label className="full-field">Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Tell customers what makes it special" rows="2" /></label></div><div className="upload-actions"><button className="text-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button small-primary" type="submit"><Check size={15} /> Publish food</button></div></form>}<div className="owner-menu-list">{ownerItems.map((item) => <div className="owner-menu-row" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.description}</small></div><span>{formatETB(item.price)}</span><span className="availability-dot">Live</span><button className="icon-button" type="button" aria-label="Edit food"><MoreHorizontal size={17} /></button></div>)}</div></section><section className="dashboard-panel owner-orders-panel"><div className="panel-heading"><div><span className="section-kicker">Incoming</span><h2>Recent orders</h2></div><span className="live-indicator"><i /> Live</span></div><div className="owner-order-list">{dashboardOrders.slice(0, 4).map((order) => <div className="owner-order-row" key={order.id}><span className="order-time">{order.time}</span><div><strong>{order.id}</strong><small>{order.customer} · {order.total} ETB</small></div><span className={`status-pill ${order.tone}`}>{order.status}</span></div>)}</div><button className="outline-button full-button" type="button" onClick={() => showToast('Opening all restaurant orders', 'info')}>View all orders <ArrowRight size={15} /></button></section></div>
    </>
  )
}

function DriverDashboard({ driverOrders, activeDriverOrder, acceptDriverOrder, showToast }) {
  const [available, setAvailable] = useState(true)
  return (
    <>
      <div className="driver-status-banner"><div className="driver-status-copy"><span className={`availability-toggle ${available ? 'online' : ''}`}><i /></span><div><strong>{available ? 'You are online' : 'You are offline'}</strong><small>{available ? 'New orders around you will appear here' : 'Go online when you are ready to deliver'}</small></div></div><button className="status-toggle-button" type="button" onClick={() => { setAvailable(!available); showToast(available ? 'You are now offline' : 'You are back online', 'info') }}>{available ? 'Go offline' : 'Go online'}</button></div>
      {activeDriverOrder && <section className="active-delivery-card"><div className="active-delivery-top"><div><span className="section-kicker">Active delivery · {activeDriverOrder.id}</span><h2>{activeDriverOrder.pickup.split('·')[0]}</h2><p>{activeDriverOrder.dropoff} · {activeDriverOrder.distance}</p></div><span className="delivery-eta"><Clock3 size={16} /> {activeDriverOrder.eta}</span></div><div className="delivery-route-row"><div className="route-point"><span className="route-dot pickup-dot"><Store size={15} /></span><span><small>Pickup</small><strong>{activeDriverOrder.pickup}</strong></span></div><ArrowRight size={18} /><div className="route-point"><span className="route-dot dropoff-dot"><MapPin size={15} /></span><span><small>Drop off</small><strong>{activeDriverOrder.dropoff}</strong></span></div><button className="primary-button" type="button" onClick={() => showToast('Delivery status updated', 'success')}>Start delivery <ArrowRight size={16} /></button></div></section>}
      <div className="driver-summary-row"><div className="driver-summary-copy"><span className="section-kicker">Your day</span><h2>{driverOrders.length} orders nearby</h2><p>Accept an order only when it fits your route.</p></div><div className="driver-earnings"><span>Today’s earnings</span><strong>ETB 540</strong><small>+18% from last Tuesday</small></div></div>
      <section className="dashboard-panel available-orders-panel"><div className="panel-heading"><div><span className="section-kicker">Near Adama center</span><h2>Available orders</h2></div><button className="date-select" type="button" onClick={() => showToast('Orders refreshed', 'success')}><RefreshCw size={14} /> Refresh</button></div>{driverOrders.length ? <div className="available-order-list">{driverOrders.map((order) => <article className="available-order-card" key={order.id}><div className="available-order-main"><div className="available-order-id"><span className="order-bag-icon"><ShoppingBag size={17} /></span><span><strong>{order.id}</strong><small>{order.time || 'Just now'}</small></span></div><div className="available-route"><div><Store size={14} /><span>{order.pickup}</span></div><div><MapPin size={14} /><span>{order.dropoff}</span></div></div><div className="available-order-meta"><span><Bike size={14} /> {order.distance}</span><span><Clock3 size={14} /> {order.eta}</span></div></div><div className="available-order-side"><strong>{formatETB(order.fee)}</strong><small>delivery fee</small><button className="primary-button small-primary" type="button" onClick={() => acceptDriverOrder(order)}>Accept <Check size={15} /></button></div></article>)}</div> : <div className="panel-empty"><Bike size={24} /><strong>No available orders</strong><span>Keep this page open and new requests will appear here.</span></div>}</section>
    </>
  )
}

function Toast({ toast, onClose }) {
  return <div className={`toast toast-${toast.tone}`}><span className="toast-icon">{toast.tone === 'warning' ? <AlertCircle size={17} /> : toast.tone === 'info' ? <Sparkles size={17} /> : <CheckCircle2 size={17} />}</span><span>{toast.message}</span><button type="button" onClick={onClose} aria-label="Close notification"><X size={15} /></button></div>
}

function Footer({ navigate }) {
  return <footer className="site-footer"><div className="footer-inner"><div><button className="brand footer-brand" type="button" onClick={() => navigate('home')}><span className="brand-mark">ae</span><span className="brand-word">adama<span>eats</span></span></button><p>Good food, closer to home.</p></div><div className="footer-links"><button type="button" onClick={() => navigate('home')}>Discover</button><button type="button" onClick={() => navigate('orders')}>Your orders</button><button type="button">Help center</button><button type="button">For partners</button></div><div className="footer-bottom"><span>© 2026 Adama Eats</span><span>Made for Adama, Ethiopia <span className="footer-heart">♥</span></span></div></div></footer>
}

export default App
