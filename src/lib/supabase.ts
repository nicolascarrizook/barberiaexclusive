import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client configuration for proper session persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure session persistence across page refreshes
    persistSession: true,
    // Use localStorage for web browsers (default, but explicit is better)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Auto refresh tokens before they expire
    autoRefreshToken: true,
    // Detect auth redirects (for OAuth, magic links, etc.)
    detectSessionInUrl: true,
    // Flow type for PKCE (more secure for SPAs)
    flowType: 'pkce'
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'barberia-exclusive-app'
    }
  }
});
