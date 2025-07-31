import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://itleyyiyhprvfdbutxbr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bGV5eWl5aHBydmZkYnV0eGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDY3NTcsImV4cCI6MjA2OTMyMjc1N30.V3_9R0cYfbGc4wIEIwm80QAruzheRVwi7aYv1l78Aow'

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeRLSDiagnosticAndFix() {
  console.log('🔍 DIAGNÓSTICO RLS - SPECIAL_DATES')
  console.log('=====================================')
  
  try {
    // 1. Diagnóstico inicial
    console.log('\n1️⃣ DIAGNÓSTICO INICIAL:')
    const { data: diagnosticData, error: diagnosticError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
            p.email, 
            p.role as rol_actual, 
            bs.name as barberia_que_posee
        FROM profiles p 
        LEFT JOIN barbershops bs ON bs.owner_id = p.id 
        WHERE p.id = auth.uid();
      `
    })
    
    if (diagnosticError) {
      console.error('❌ Error en diagnóstico:', diagnosticError)
      
      // Alternativa usando consultas directas
      console.log('🔄 Intentando con consultas directas...')
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, role')
        .single()
        
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('name')
        .single()
        
      console.log('📊 Datos del perfil:', profileData)
      console.log('📊 Datos de barbería:', barbershopData)
    } else {
      console.log('📊 Resultado diagnóstico:', diagnosticData)
    }

    // 2. Verificar el problema específico
    console.log('\n2️⃣ VERIFICACIÓN DEL PROBLEMA:')
    const { data: currentUser } = await supabase.auth.getUser()
    console.log('👤 Usuario actual:', currentUser?.user?.email)
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .single()
    console.log('👤 Rol actual en profiles:', profile)
    
    const { data: ownedBarbershops } = await supabase
      .from('barbershops')
      .select('name, id')
    console.log('🏪 Barberías que posee:', ownedBarbershops)

    // 3. Intentar insertar un feriado de prueba para verificar RLS
    console.log('\n3️⃣ PRUEBA DE INSERCIÓN (para verificar RLS):')
    if (ownedBarbershops && ownedBarbershops.length > 0) {
      const testDate = new Date().toISOString().split('T')[0]
      const { data: insertTest, error: insertError } = await supabase
        .from('special_dates')
        .insert({
          barbershop_id: ownedBarbershops[0].id,
          date: testDate,
          is_holiday: true,
          reason: 'Test RLS - BORRAR'
        })
        
      if (insertError) {
        console.error('❌ Error de RLS confirmado:', insertError.message)
        console.log('📝 Este es exactamente el problema que necesitamos resolver')
      } else {
        console.log('✅ Inserción exitosa - RLS funciona correctamente')
        
        // Limpiar la prueba
        await supabase
          .from('special_dates')
          .delete()
          .eq('reason', 'Test RLS - BORRAR')
      }
    }

    // 4. Mostrar la solución requerida
    console.log('\n4️⃣ SOLUCIÓN REQUERIDA:')
    console.log('Para resolver este problema, necesitas ejecutar estas consultas SQL en el dashboard de Supabase:')
    console.log(`
-- 1. Actualizar el rol a 'owner' para usuarios que poseen barberías
UPDATE profiles 
SET 
    role = 'owner',
    updated_at = NOW()
WHERE id = auth.uid() 
AND EXISTS (
    SELECT 1 FROM barbershops 
    WHERE owner_id = auth.uid()
);

-- 2. Verificar el cambio
SELECT email, role, updated_at
FROM profiles 
WHERE id = auth.uid();
    `)
    
    console.log('\n🌐 Para ejecutar estos comandos:')
    console.log('1. Ve a: https://supabase.com/dashboard/project/itleyyiyhprvfdbutxbr/sql')
    console.log('2. Copia las consultas SQL de arriba')
    console.log('3. Ejecuta una por una')
    console.log('4. Verifica que el rol cambie a "owner"')

  } catch (error) {
    console.error('💥 Error general:', error.message)
  }
}

executeRLSDiagnosticAndFix()