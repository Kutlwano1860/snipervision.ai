# SniperVision AI

AI-powered trading analysis platform. Upload any chart screenshot and get institutional-grade analysis, smart lot sizing, live market context, and a complete trade plan — in seconds.

---

## 🚀 Quick Start (5 minutes)

### Step 1 — Clone or download the project

If using GitHub:
```bash
git clone https://github.com/yourusername/snipervision.ai.git
cd snipervision.ai
```

Or just copy the project folder to your machine and open it in VS Code.

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Set up your environment variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Now open `.env.local` and fill in your keys. Here's where to get each one:

**ANTHROPIC_API_KEY** (required to run AI analysis)
- Go to console.anthropic.com
- Sign up / login
- Click "API Keys" → Create Key
- Paste it in

**NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY** (required for auth + database)
- Go to supabase.com → New Project
- Go to Project Settings → API
- Copy "Project URL" and "anon public" key

**SUPABASE_SERVICE_ROLE_KEY**
- Same page as above — copy "service_role" key

**STRIPE keys** (optional for now — skip if just testing)
- Go to stripe.com → Developers → API Keys
- Use test mode keys (start with pk_test_ and sk_test_)

**FINNHUB_API_KEY** (optional — for live market data)
- Go to finnhub.io → Register → copy your key

---

### Step 4 — Set up Supabase database

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Open the file `src/lib/supabase/schema.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run"

That creates all your tables, policies, and triggers automatically.

---

### Step 5 — Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser. That's it — the app is running!

---

## 📁 Project Structure

```
snipervision.ai/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Landing page
│   │   ├── login/page.tsx        ← Login
│   │   ├── register/page.tsx     ← 3-step registration
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        ← Dashboard nav + modals
│   │   │   ├── page.tsx          ← Main analyse screen
│   │   │   ├── journal/page.tsx  ← Trade journal
│   │   │   └── watchlist/page.tsx← Watchlist
│   │   └── api/
│   │       └── analyse/route.ts  ← Claude API call (key hidden here)
│   ├── lib/
│   │   ├── constants.ts          ← Currency configs, plans, tiers
│   │   ├── prompt.ts             ← Claude analysis prompt builder
│   │   ├── store.ts              ← Zustand global state
│   │   └── supabase/
│   │       ├── client.ts         ← Browser Supabase client
│   │       ├── server.ts         ← Server Supabase client
│   │       └── schema.sql        ← Database schema (paste into Supabase)
│   └── types/index.ts            ← All TypeScript types
├── .env.local.example            ← Copy to .env.local and fill in keys
├── netlify.toml                  ← Netlify deployment config
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 🔑 The Most Important Thing

The `ANTHROPIC_API_KEY` lives in `.env.local` on your machine (or in Netlify's environment variables when deployed). It is **never** sent to the browser. Users never see it.

The flow:
```
User uploads chart
      ↓
Browser sends image to /api/analyse (your server)
      ↓
Your server reads ANTHROPIC_API_KEY from .env.local
      ↓
Your server calls Claude API
      ↓
Result sent back to browser
      ↓
User sees analysis
```

---

## 🌐 Deploy to Netlify

1. Push your code to GitHub
2. Go to netlify.com → Add new site → Import from GitHub
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Go to Site Settings → Environment Variables
6. Add all your variables from `.env.local` (same keys, same values)
7. Also add: `@netlify/plugin-nextjs` under Plugins, or run:
   ```bash
   npm install @netlify/plugin-nextjs
   ```
8. Deploy — Netlify gives you a live URL instantly

---

## 💰 Running Costs

| Service       | Cost to start |
|---------------|---------------|
| Netlify       | Free          |
| Supabase      | Free          |
| Stripe        | Free (test mode) |
| Finnhub       | Free tier     |
| Anthropic API | $5 free credit (~150-500 analyses) |

**Total upfront: $0**

---

## 🛠 Adding Features Later

**To add Stripe payments:**
1. Create products in Stripe dashboard
2. Add price IDs to `.env.local`
3. Build `/api/stripe/checkout` route using the Stripe SDK

**To add real live market data:**
1. Finnhub API key is already in `.env.local`
2. Create `/api/market-data` route that fetches from Finnhub
3. Replace demo ticker data in the components

**To go React Native (mobile):**
- The API routes (`/api/analyse`) work identically from React Native
- Just call `https://yourdomain.com/api/analyse` from the mobile app
- Same key, same logic, works across both platforms

---

## 📞 Subscription Tier Logic

| Tier     | Daily Limit | Fundamental | Macro | SMC | Multi-TF |
|----------|-------------|-------------|-------|-----|----------|
| Free     | 3           | ✗           | ✗     | ✗   | ✗        |
| Premium  | 20          | ✓           | ✗     | ✗   | ✗        |
| Platinum | Unlimited   | ✓           | ✓     | ✓   | ✓        |
| Diamond  | Unlimited   | ✓           | ✓     | ✓   | ✓        |

Tier is stored in Supabase `profiles.tier` and checked server-side on every API call.

---

*SniperVision AI provides educational analysis only. Not financial advice.*
