// Script de diagnóstico y solución para problemas RLS con feriados
// Para ejecutar en la consola del navegador mientras estás en la aplicación

async function diagnosticarProblemaRLS() {
  console.log('🔍 Iniciando diagnóstico de RLS para feriados...\n');
  
  try {
    // 1. Verificar usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    console.log('👤 Usuario actual:', user.email);
    console.log('🆔 User ID:', user.id);
    
    // 2. Verificar perfil y rol
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Error al obtener perfil:', profileError);
    } else {
      console.log('📋 Perfil:', profile);
      console.log(`🎭 Rol actual: ${profile.role}`);
      
      if (profile.role === 'cliente') {
        console.warn('⚠️ PROBLEMA DETECTADO: Tu rol es "cliente" pero necesitas ser "owner" para gestionar feriados');
      }
    }
    
    // 3. Verificar barbershops donde es owner
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', user.id);
      
    if (barbershopsError) {
      console.error('❌ Error al obtener barbershops:', barbershopsError);
    } else {
      console.log(`🏪 Barbershops donde eres owner: ${barbershops.length}`);
      barbershops.forEach(b => console.log(`  - ${b.name} (ID: ${b.id})`));
    }
    
    // 4. Intentar consultar special_dates
    console.log('\n📅 Probando acceso a special_dates...');
    const { data: holidays, error: holidaysError } = await supabase
      .from('special_dates')
      .select('*')
      .limit(5);
      
    if (holidaysError) {
      console.error('❌ Error al acceder a special_dates:', holidaysError);
    } else {
      console.log(`✅ Puedes ver ${holidays.length} feriados`);
    }
    
    // 5. Diagnóstico final
    console.log('\n📊 DIAGNÓSTICO FINAL:');
    if (profile?.role === 'cliente') {
      console.log('❌ Tu rol es "cliente" - esto causa el error PGRST116');
      console.log('🔧 SOLUCIÓN: Ejecuta el script SQL fix_user_role_to_owner.sql en Supabase');
    } else if (profile?.role === 'owner' && barbershops?.length === 0) {
      console.log('⚠️ Eres owner pero no tienes barbershops asignadas');
      console.log('🔧 SOLUCIÓN: Asigna una barbershop a tu usuario');
    } else if (profile?.role === 'owner' && barbershops?.length > 0) {
      console.log('✅ Configuración correcta - deberías poder gestionar feriados');
    }
    
  } catch (error) {
    console.error('💥 Error durante el diagnóstico:', error);
  }
}

// Función para intentar arreglar el rol automáticamente
async function intentarArreglarRol() {
  console.log('🔧 Intentando actualizar rol a owner...\n');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Intentar actualizar el rol
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'owner' })
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error al actualizar rol:', error);
      console.log('💡 Necesitas ejecutar el script SQL directamente en Supabase');
    } else {
      console.log('✅ Rol actualizado exitosamente:', data);
      console.log('🔄 Por favor, cierra sesión y vuelve a iniciar sesión');
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Ejecutar diagnóstico automáticamente
console.log('Para ejecutar el diagnóstico, escribe: diagnosticarProblemaRLS()');
console.log('Para intentar arreglar el rol, escribe: intentarArreglarRol()');