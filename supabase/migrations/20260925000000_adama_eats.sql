create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'owner', 'driver', 'admin');
create type public.approval_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_restaurant_owner(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = target_restaurant_id
      and r.owner_id = auth.uid()
  );
$$;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  cuisine text,
  phone text,
  logo_url text,
  cover_url text,
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  delivery_zones jsonb not null default '[]'::jsonb,
  approval_status public.approval_status not null default 'pending',
  is_open boolean not null default true,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_owner_id_idx on public.restaurants(owner_id);
create index restaurants_approval_status_idx on public.restaurants(approval_status);

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  name_am text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create index categories_restaurant_id_idx on public.categories(restaurant_id);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  name_am text,
  description text,
  description_am text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_popular boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_items_restaurant_id_idx on public.food_items(restaurant_id);
create index food_items_category_id_idx on public.food_items(category_id);

create trigger food_items_set_updated_at
before update on public.food_items
for each row execute function public.set_updated_at();

create table public.food_images (
  id uuid primary key default gen_random_uuid(),
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.driver_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type text,
  license_number text,
  approval_status public.approval_status not null default 'pending',
  is_available boolean not null default false,
  current_location jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger driver_profiles_set_updated_at
before update on public.driver_profiles
for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  driver_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'paid', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'
  )),
  fulfillment_type text not null default 'delivery' check (fulfillment_type in ('delivery', 'pickup')),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null check (total >= 0),
  delivery_address text,
  delivery_phone text,
  customer_note text,
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_restaurant_id_idx on public.orders(restaurant_id);
create index orders_driver_id_idx on public.orders(driver_id);
create index orders_status_idx on public.orders(status);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  item_note text,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'telebirr',
  provider_transaction_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  raw_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create index payments_order_id_idx on public.payments(order_id);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.accept_order(target_order_id uuid)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare
  claimed_order public.orders;
begin
  if auth.uid() is null or public.current_user_role() <> 'driver' then
    raise exception 'Only approved drivers can accept orders';
  end if;

  update public.orders
  set driver_id = auth.uid(), status = 'assigned', accepted_at = now(), updated_at = now()
  where id = target_order_id
    and driver_id is null
    and status in ('paid', 'preparing', 'ready')
  returning * into claimed_order;

  if claimed_order.id is null then
    raise exception 'This order is no longer available';
  end if;

  return claimed_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.food_items enable row level security;
alter table public.food_images enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Approved restaurants are public"
on public.restaurants for select
to anon, authenticated
using (approval_status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy "Owners can register restaurants"
on public.restaurants for insert
to authenticated
with check (owner_id = auth.uid() and approval_status = 'pending');

create policy "Owners and admins can update restaurants"
on public.restaurants for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "Admins can delete restaurants"
on public.restaurants for delete
to authenticated
using (public.is_admin());

create policy "Approved restaurant categories are public"
on public.categories for select
to anon, authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and (r.approval_status = 'approved' or r.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Owners and admins manage categories"
on public.categories for all
to authenticated
using (public.is_restaurant_owner(restaurant_id) or public.is_admin())
with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

create policy "Approved food items are public"
on public.food_items for select
to anon, authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and (r.approval_status = 'approved' or r.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Owners and admins manage food items"
on public.food_items for all
to authenticated
using (public.is_restaurant_owner(restaurant_id) or public.is_admin())
with check (public.is_restaurant_owner(restaurant_id) or public.is_admin());

create policy "Owners and admins manage food images"
on public.food_images for all
to authenticated
using (
  exists (
    select 1 from public.food_items f
    where f.id = food_item_id and (public.is_restaurant_owner(f.restaurant_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.food_items f
    where f.id = food_item_id and (public.is_restaurant_owner(f.restaurant_id) or public.is_admin())
  )
);

create policy "Drivers can view their own driver profile"
on public.driver_profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Drivers can create their own driver profile"
on public.driver_profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Drivers and admins can update driver profiles"
on public.driver_profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Customers can view their orders"
on public.orders for select
to authenticated
using (customer_id = auth.uid() or restaurant_id in (
  select id from public.restaurants where owner_id = auth.uid()
) or driver_id = auth.uid() or public.is_admin());

create policy "Customers can create their orders"
on public.orders for insert
to authenticated
with check (customer_id = auth.uid());

create policy "Order participants can update orders"
on public.orders for update
to authenticated
using (customer_id = auth.uid() or driver_id = auth.uid() or public.is_admin() or restaurant_id in (
  select id from public.restaurants where owner_id = auth.uid()
))
with check (customer_id = auth.uid() or driver_id = auth.uid() or public.is_admin() or restaurant_id in (
  select id from public.restaurants where owner_id = auth.uid()
));

create policy "Order participants can view items"
on public.order_items for select
to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = order_id
    and (o.customer_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin() or o.restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    ))
));

create policy "Customers can create order items"
on public.order_items for insert
to authenticated
with check (exists (
  select 1 from public.orders o
  where o.id = order_id and o.customer_id = auth.uid()
));

create policy "Customers can view their payments"
on public.payments for select
to authenticated
using (exists (
  select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
) or public.is_admin());

insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

create policy "Public can view food images"
on storage.objects for select
to public
using (bucket_id = 'food-images');

create policy "Authenticated partners can upload food images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'food-images' and public.current_user_role() in ('owner', 'admin'));

create policy "Authenticated partners can update food images"
on storage.objects for update
to authenticated
using (bucket_id = 'food-images' and public.current_user_role() in ('owner', 'admin'));

create policy "Authenticated partners can delete food images"
on storage.objects for delete
to authenticated
using (bucket_id = 'food-images' and public.current_user_role() in ('owner', 'admin'));

alter publication supabase_realtime add table public.orders;
