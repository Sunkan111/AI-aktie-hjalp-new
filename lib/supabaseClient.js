import { createClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client instance.
 * @returns {Object|null} Supabase client or null if environment variables are not set
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  // Guard check: return null if environment variables are not set
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
}
