# Echo Agency Platform — Setup Guide

## 1. Install Node.js

If you don't have Node.js installed, download and install it from:
https://nodejs.org  (choose the LTS version)

Verify installation:
```bash
node --version   # should show v18+ or v20+
npm --version
```

---

## 2. Install project dependencies

```bash
cd /Users/josuemolanouribe/echo-agency
npm install
```

---

## 3. Create a Supabase project

1. Go to https://supabase.com and sign up / log in
2. Click **New Project**
3. Choose a name (e.g. `echo-agency`), set a strong database password, pick a region close to you
4. Wait ~2 minutes for it to provision

---

## 4. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the SQL Editor and click **Run**

This creates all tables, RLS policies, and the `calculate_revenue_metrics` function.

---

## 5. Enable Google OAuth (optional — needed for Google Calendar sign-in)

1. In Supabase dashboard → **Authentication** → **Providers** → **Google**
2. Enable it, then follow the instructions to create a Google Cloud OAuth app
3. Set the redirect URL shown by Supabase in your Google Cloud Console
4. Paste the Client ID and Secret back into Supabase

---

## 6. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials (found in Supabase dashboard → **Project Settings** → **API**):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
```

---

## 7. Start the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 8. First login

- Go to `/login` and create an account with email + password
- The first user will be the owner — you can invite teammates via Supabase Auth dashboard
- Default PIN for protected tabs: **1234** (change it in Settings)

---

## Edge Function (AI task organizer)

The "Organiser avec l'IA" button in Daily Tasks uses a Supabase Edge Function.
To deploy it:

```bash
# Install Supabase CLI if needed
npm install -g supabase

supabase login
supabase link --project-ref your-project-id
supabase functions deploy organize-tasks
```

The function source goes in `supabase/functions/organize-tasks/index.ts`.
It calls the Lovable AI Gateway → Gemini 2.5 Flash to sort tasks by difficulty.
This is optional — the rest of the app works without it.
