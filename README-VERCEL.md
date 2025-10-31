# Vercel Deployment Guide

## Supabase Setup

This application uses Supabase for persistent storage of trading journal entries. Follow these steps to set up Supabase integration:

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Choose a name for your project (e.g., "ai-aktie-hjalp")
   - **Database Password**: Create a strong password (save it securely)
   - **Region**: Choose a region close to your users
4. Click "Create new project" and wait for it to initialize (this may take a few minutes)

### 2. Apply Database Schema

Once your project is created, you need to create the journal table:

#### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase project dashboard, navigate to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the contents of `supabase/schema.sql` from this repository
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL and create the table

#### Option B: Using psql Command Line

1. In your Supabase project, go to **Project Settings** → **Database**
2. Find the "Connection string" section and copy the connection string (use the "URI" format)
3. Run the following command in your terminal:
   ```bash
   psql "your-connection-string-here" -f supabase/schema.sql
   ```

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Project Settings** → **API**
2. You'll need two values:
   - **Project URL**: Found under "Project URL" (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key**: Found under "Project API keys" → "anon public"

### 4. Configure Environment Variables in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following environment variables:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | Your Supabase Project URL |
   | `SUPABASE_KEY` | Your Supabase anon/public key |

4. Make sure to add these for all environments (Production, Preview, Development)
5. Click "Save"

### 5. Redeploy Your Application

After adding the environment variables:

1. Go to the **Deployments** tab in Vercel
2. Click on the three dots (...) next to your latest deployment
3. Select "Redeploy"
4. Your application will now have access to Supabase

## Fallback Behavior

If the Supabase environment variables are not set, the application will automatically fall back to local file storage using `data/journal.json`. This allows you to:

- Test the application locally without Supabase
- Deploy without Supabase initially and add it later
- Have a backup storage mechanism

## Testing Locally

To test the journal API locally:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Test the API endpoints (see main README for curl examples)

## Verifying the Setup

After deployment, you can verify that Supabase is working by:

1. Making a POST request to create a journal entry
2. Checking your Supabase dashboard → **Table Editor** → **journal** table
3. Verifying the entry appears in the table

If you see entries in the Supabase table, your integration is working correctly!

## Troubleshooting

### Environment Variables Not Working

- Make sure you've saved the environment variables in Vercel
- Redeploy after adding/changing environment variables
- Check the Vercel deployment logs for any errors

### Database Connection Errors

- Verify your `SUPABASE_URL` doesn't have trailing slashes
- Ensure you're using the **anon/public** key, not the service role key
- Check that your Supabase project is active and not paused

### Schema Not Applied

- Run the SQL in the Supabase SQL Editor to verify table creation
- Check for any error messages in the SQL Editor
- Ensure you're connected to the correct database

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
