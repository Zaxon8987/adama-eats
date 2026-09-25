import { supabase } from './supabase'

function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AE'
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `restaurant-${Date.now()}`
}

function fileName(value) {
  return String(value || 'food-image.jpg').toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
}

function mapFoodItem(item) {
  return {
    id: item.id,
    restaurantId: item.restaurant_id,
    name: item.name,
    description: item.description || 'Freshly prepared by the restaurant.',
    price: Number(item.price || 0),
    category: item.categories?.name?.toLowerCase().replace(/\s+/g, '-') || 'traditional',
    image: item.image_url || 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=82',
    popular: item.is_popular,
    available: item.is_available,
  }
}

export async function fetchProfile(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_active')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchOwnerWorkspace(userId) {
  if (!supabase || !userId) return { restaurant: null, categories: [], foodItems: [] }

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (restaurantError) throw restaurantError
  if (!restaurant) return { restaurant: null, categories: [], foodItems: [] }

  const [{ data: categories, error: categoryError }, { data: foodItems, error: foodError }] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
    supabase.from('food_items').select('*, categories(name)').eq('restaurant_id', restaurant.id).order('sort_order'),
  ])
  if (categoryError) throw categoryError
  if (foodError) throw foodError

  return { restaurant, categories: categories || [], foodItems: (foodItems || []).map(mapFoodItem) }
}

export async function createRestaurant({ userId, name, cuisine, description, phone, deliveryFee }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const baseSlug = slugify(name)
  const payload = {
    owner_id: userId,
    name,
    slug: baseSlug,
    cuisine: cuisine || null,
    description: description || null,
    phone: phone || null,
    delivery_fee: Number(deliveryFee || 0),
    approval_status: 'pending',
    is_open: true,
  }

  let { data, error } = await supabase.from('restaurants').insert(payload).select('*').single()
  if (error?.code === '23505') {
    const result = await supabase
      .from('restaurants')
      .insert({ ...payload, slug: `${baseSlug}-${Date.now().toString(36)}` })
      .select('*')
      .single()
    data = result.data
    error = result.error
  }
  if (error) throw error
  return data
}

async function ensureCategory(restaurantId, categoryName) {
  const name = String(categoryName || 'Traditional').trim() || 'Traditional'
  const { data: existing, error: existingError } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .ilike('name', name)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing

  const { data, error } = await supabase
    .from('categories')
    .insert({ restaurant_id: restaurantId, name })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function createFoodItem({ userId, restaurantId, form, file }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  let imageUrl = form.imageUrl || null

  if (file) {
    const path = `${userId}/${restaurantId}/${crypto.randomUUID()}-${fileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('food-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) throw uploadError
    imageUrl = supabase.storage.from('food-images').getPublicUrl(path).data.publicUrl
  }

  const category = await ensureCategory(restaurantId, form.category)
  const { data, error } = await supabase
    .from('food_items')
    .insert({
      restaurant_id: restaurantId,
      category_id: category.id,
      name: form.name,
      description: form.description || null,
      price: Number(form.price || 0),
      image_url: imageUrl,
      is_available: true,
      is_popular: Boolean(form.popular),
    })
    .select('*, categories(name)')
    .single()
  if (error) throw error
  return mapFoodItem(data)
}

export async function updateFoodItem(itemId, changes) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('food_items')
    .update(changes)
    .eq('id', itemId)
    .select('*, categories(name)')
    .single()
  if (error) throw error
  return mapFoodItem(data)
}

export async function fetchAdminApprovals() {
  if (!supabase) return { restaurants: [], drivers: [] }
  const [{ data: restaurants, error: restaurantError }, { data: drivers, error: driverError }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, owner_id, name, cuisine, approval_status, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('driver_profiles')
      .select('id, vehicle_type, license_number, approval_status, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true }),
  ])
  if (restaurantError) throw restaurantError
  if (driverError) throw driverError

  return {
    restaurants: (restaurants || []).map((restaurant) => ({
      id: restaurant.id,
      ownerId: restaurant.owner_id,
      name: restaurant.name,
      type: 'Restaurant owner',
      detail: restaurant.cuisine || 'New restaurant application',
      initials: initials(restaurant.name),
      tone: 'mama',
      createdAt: restaurant.created_at,
    })),
    drivers: (drivers || []).map((driver) => ({
      id: driver.id,
      name: 'Driver applicant',
      type: 'Driver',
      detail: `${driver.vehicle_type || 'Vehicle not set'}${driver.license_number ? ' · license on file' : ''}`,
      initials: 'DR',
      tone: 'driver',
      createdAt: driver.created_at,
    })),
  }
}

export async function approveRestaurant(restaurantId, ownerId, approved = true) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const status = approved ? 'approved' : 'rejected'
  const { error: restaurantError } = await supabase
    .from('restaurants')
    .update({ approval_status: status })
    .eq('id', restaurantId)
  if (restaurantError) throw restaurantError

  if (approved && ownerId) {
    const { error: profileError } = await supabase.from('profiles').update({ role: 'owner' }).eq('id', ownerId)
    if (profileError) throw profileError
  }
}

export async function approveDriver(driverId, approved = true) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const status = approved ? 'approved' : 'rejected'
  const { error: profileError } = await supabase
    .from('driver_profiles')
    .update({ approval_status: status })
    .eq('id', driverId)
  if (profileError) throw profileError

  if (approved) {
    const { error: roleError } = await supabase.from('profiles').update({ role: 'driver' }).eq('id', driverId)
    if (roleError) throw roleError
  }
}

export async function fetchDriverWorkspace(userId) {
  if (!supabase || !userId) return { profile: null, availableOrders: [], activeOrder: null }

  const { data: profile, error: profileError } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) return { profile: null, availableOrders: [], activeOrder: null }

  const [{ data: available, error: availableError }, { data: active, error: activeError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, total, delivery_fee, delivery_address, created_at, restaurants(name)')
      .is('driver_id', null)
      .in('status', ['paid', 'preparing', 'ready'])
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, order_number, status, total, delivery_fee, delivery_address, created_at, restaurants(name)')
      .eq('driver_id', userId)
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false })
      .limit(1),
  ])
  if (availableError) throw availableError
  if (activeError) throw activeError

  const mapOrder = (order) => ({
    id: order.id,
    displayId: `AE-${order.order_number}`,
    restaurant: order.restaurants?.name || 'Local restaurant',
    pickup: order.restaurants?.name || 'Restaurant',
    dropoff: order.delivery_address || 'Adama delivery address',
    distance: 'Nearby',
    fee: Number(order.delivery_fee || 0),
    eta: '30 min',
    items: 'Food order',
    status: order.status,
  })

  return {
    profile,
    availableOrders: (available || []).map(mapOrder),
    activeOrder: active?.[0] ? mapOrder(active[0]) : null,
  }
}

export async function createDriverProfile({ userId, vehicleType, licenseNumber }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('driver_profiles')
    .insert({
      id: userId,
      vehicle_type: vehicleType || null,
      license_number: licenseNumber || null,
      approval_status: 'pending',
      is_available: false,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function setDriverAvailability(userId, isAvailable) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('driver_profiles')
    .update({ is_available: Boolean(isAvailable) })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function acceptDriverOrder(orderId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('accept_order', { target_order_id: orderId })
  if (error) throw error
  return data
}

export async function updateDriverOrderStatus(orderId, status) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
