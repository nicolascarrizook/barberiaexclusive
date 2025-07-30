// // // // // import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database';

const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const _supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
