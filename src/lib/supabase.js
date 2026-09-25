import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// The app deliberately runs with local demo data when these values are absent.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

const fallbackRestaurantImage = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=82'
const fallbackFoodImage = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=82'

function categorySlug(category) {
  const value = String(category || 'traditional').toLowerCase().trim()
  return value.replace(/[^a-z0-9]+/g, '-') || 'traditional'
}

export async function fetchApprovedRestaurants() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, description, cuisine, phone, logo_url, cover_url, delivery_fee, rating, is_open, food_items(id, name, description, price, image_url, is_popular, categories(name))')
    .eq('approval_status', 'approved')
    .eq('is_open', true)
    .order('rating', { ascending: false })

  if (error) throw error

  return (data || []).map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    cuisine: restaurant.cuisine || 'Local kitchen',
    description: restaurant.description || 'A local kitchen serving Adama.',
    rating: Number(restaurant.rating || 0),
    reviews: 0,
    eta: '25–40 min',
    deliveryFee: Number(restaurant.delivery_fee || 0),
    distance: 'Nearby',
    badge: 'Open now',
    image: restaurant.cover_url || fallbackRestaurantImage,
    logo: restaurant.name.slice(0, 2).toUpperCase(),
    logoClass: 'logo-buna',
    menu: (restaurant.food_items || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || 'Freshly prepared by the restaurant.',
      price: Number(item.price || 0),
      category: categorySlug(item.categories?.name),
      popular: item.is_popular,
      image: item.image_url || fallbackFoodImage,
    })),
  }))
}

export async function createTelebirrPayment(payload) {
  if (!supabase) {
    return {
      demo: true,
      transactionId: `DEMO-${Date.now()}`,
      message: 'Demo payment created. Connect the Telebirr Edge Function for live payments.',
    }
  }

  const { data, error } = await supabase.functions.invoke('telebirr-create-payment', {
    body: payload,
  })

  if (error) throw error
  return data
}
