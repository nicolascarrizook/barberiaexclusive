import { supabase } from './lib/supabase'

async function testConnection() {
  console.log('🔄 Testing Supabase connection...')
  
  try {
    // Test 1: Check if we can connect
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error connecting to profiles table:', profileError)
    } else {
      console.log('✅ Successfully connected to Supabase')
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
      'promotions'
    ]
    
    console.log('\n📊 Checking tables...')
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Accessible`)
      }
    }
    
    // Test 3: Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('\n🔐 Auth status: Not authenticated (this is normal)')
    } else if (user) {
      console.log(`\n🔐 Auth status: Logged in as ${user.email}`)
    }
    
    console.log('\n✨ Connection test completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testConnection()