// Load environment variables manually
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, value] = trimmed.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  console.log(`📍 URL: ${supabaseUrl}`);

  try {
    // Test 1: Check if we can connect
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error connecting to profiles table:', profileError);
    } else {
      console.log('✅ Successfully connected to Supabase');
    }

    // Test 2: List tables
    const tables = [
      'profiles',
      'barbershops',
      'barbers',
      'services',
      'appointments',
      'payments',
      'reviews',
      'notifications',
      'waiting_list',
      'promotions',
    ];

    console.log('\n📊 Checking tables...');
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible`);
      }
    }

    // Test 3: Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.log('\n🔐 Auth status: Not authenticated (this is normal)');
    } else if (user) {
      console.log(`\n🔐 Auth status: Logged in as ${user.email}`);
    }

    console.log('\n✨ Connection test completed!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testConnection();
