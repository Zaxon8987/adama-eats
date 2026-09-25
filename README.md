# Adama Eats

A mobile-first food delivery marketplace for Adama, Ethiopia.

The first version is a Vite + React frontend with Supabase-ready authentication, database, storage, realtime, and Edge Function integration points.

## Included in this first slice

- Customer marketplace with restaurant and menu browsing
- Category filters and search
- Cart and ETB checkout flow
- Telebirr payment placeholder with a secure Edge Function boundary
- Customer order tracking view
- Admin dashboard with live approval actions
- Restaurant-owner onboarding, menu uploads, pricing, and availability controls
- Driver onboarding, availability controls, and atomic order acceptance
- Amharic/English UI switcher foundation
- Responsive mobile navigation and cart drawer
- GitHub Pages deployment workflow

The UI uses local demo data until Supabase environment variables are configured. This makes the frontend previewable immediately without exposing credentials.

## Local development

Requirements:

- Node.js 20 or newer
- npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

To connect a hosted Supabase project, set these values in `.env.local`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Never put a Supabase service-role/secret key in a `VITE_*` variable. Browser code should only receive the publishable/anon key and rely on Row Level Security.

## Supabase setup

After installing and authenticating the Supabase CLI:

```bash
npx supabase login
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The initial schema is in `supabase/migrations/20260925000000_adama_eats.sql`. It creates the profile, restaurant, menu, order, driver, payment, and storage foundations plus Row Level Security policies.

Deploy the Edge Function after configuring Telebirr merchant credentials:

```bash
npx supabase functions deploy telebirr-create-payment
```

The included function intentionally returns a safe demo response until the approved Telebirr API contract and merchant secrets are supplied. Do not mark an order paid from a browser redirect alone; verify payment server-to-server.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the Vite app and publishes `dist/` to GitHub Pages.

For a repository named `adama-eats`, set the Pages source to **GitHub Actions**. The Vite build uses relative asset paths so it works under a project subpath. Add these as repository secrets for future Supabase migrations:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

Do not add Telebirr secrets to the frontend repository variables. Store them as Supabase Edge Function secrets.

## Roles

- **Customer:** browse, order, and track
- **Restaurant owner:** manage an approved restaurant, menu, prices, images, and delivery fees
- **Driver:** accept available orders and update delivery status
- **Admin:** approve owners/drivers and monitor the platform

## Phone authentication

Public sign-in and account creation use Ethiopian phone numbers with a password. SMS verification is intentionally disabled for the MVP, so no OTP or SMS provider is required. Supabase still needs the Phone provider enabled for phone/password identities. Add rate limiting and a phone verification/recovery flow before production launch.

## Partner onboarding

1. Create a customer account from the site.
2. Use the role selector to open the Restaurant owner or Driver workspace.
3. Submit the restaurant or driver application.
4. An admin reviews the pending request and approves or rejects it.
5. Approved partners can manage live Supabase records through the dashboard.

Admin accounts should be promoted from the Supabase Dashboard rather than through a public signup field. Never allow a browser-controlled role value to grant admin access.

## Production notes

The Supabase Free plan is suitable for a demo or small pilot, but its storage/database quotas and inactivity behavior are not a substitute for backups and a production SLA. Before accepting real money, add verified Telebirr merchant integration, database backups, image moderation/compression, notification delivery, and an operational support process.
