# Database Setup Guide

This guide will help you set up Supabase (a free PostgreSQL database) to enable syncing across all your devices and browsers.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account (no credit card required)
3. Create a new project
4. Choose a name and database password (save this password!)
5. Select a region close to you
6. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: This is your project URL. If you don't see it directly, it's in the format `https://<project-id>.supabase.co`
   - **Project ID**: If you only see the Project ID, your URL is `https://<your-project-id>.supabase.co`
   - **API Key**: Look for one of these (they're all the same thing, just different names):
     - **Publishable key** (recommended - this is what you want!)
     - **anon key** or **anon public** key
     - **public key**
     - It's the one that starts with `eyJ...` and is safe to use in client-side code

**Important**: 
- ✅ **Use the Publishable key** (or anon/public key) - this is safe for client-side use
- ❌ **DO NOT use the service_role key** - that's secret and should never be exposed in the browser

**Note**: If you only see the Project ID, you can construct the URL like this:
- If your Project ID is `abcdefghijklmnop`, your URL is `https://abcdefghijklmnop.supabase.co`

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
```

**Important:** 
- Replace `your_project_url_here` with your Project URL (or construct it from Project ID)
- Replace `your_publishable_key_here` with your **Publishable key** (or anon/public key) from Step 2
- Make sure you're using the **Publishable key**, NOT the service_role key

## Step 4: Install Dependencies

Run this command in your terminal:

```bash
npm install @supabase/supabase-js
```

## Step 5: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/001_create_concerts_table.sql` (creates `shows` table)
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## Step 6: Verify Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see a `shows` table
3. The table should be empty initially

## Step 7: Test the App

1. Start your development server: `npm run dev`
2. Open the app in your browser
3. Try adding a show - it should save to the database
4. Check the Supabase **Table Editor** - you should see your show there!

## Step 8: Deploy to Vercel

When deploying to Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the same two variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy your app

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists in the root directory
- Check that the variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after adding environment variables

### "Failed to fetch shows" error
- Check that you've run the SQL migration (Step 5)
- Verify your Supabase URL and key are correct
- Check the browser console for more detailed error messages

### Data not syncing
- Make sure you're using the same Supabase project on all devices
- Check that environment variables are set correctly on all deployments

## Security Note

The **Publishable key** (also called anon/public key) is safe to use in client-side code. Supabase uses Row Level Security (RLS) to protect your data. The current setup allows all operations, but you can add authentication later if needed.

**Never expose the service_role key** - that's a secret key that should only be used on the server side.

## Next Steps (Optional)

- Add user authentication for multi-user support
- Set up real-time subscriptions for live updates
- Add data validation and constraints
- Set up backups

