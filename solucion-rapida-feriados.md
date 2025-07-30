# Solución Rápida para el Error de Feriados

## Problema Identificado

1. **UI arreglada**: Ya se corrigió para mostrar "Propietario" en lugar de "Cliente"
2. **Error PGRST116**: Ocurre porque las consultas esperan un solo resultado pero obtienen 0 debido a las políticas RLS

## Solución Inmediata

### Paso 1: Cerrar sesión y volver a iniciar
Esto actualizará el token de autenticación y refrescará el rol en la UI.

### Paso 2: Si el error persiste, ejecutar este script en la consola del navegador:

```javascript
// Verificar el estado actual
async function verificarEstado() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Usuario actual:', user?.email);
  console.log('User ID:', user?.id);
  
  // Verificar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('Perfil:', profile);
  console.log('Rol:', profile?.role);
  
  // Verificar barbershop
  const { data: barbershop } = await supabase
    .from('barbershops')
    .select('*')
    .eq('owner_id', user.id)
    .single();
    
  console.log('Barbershop:', barbershop);
  
  // Intentar crear un feriado de prueba
  const testDate = new Date().toISOString().split('T')[0];
  const { data: holiday, error } = await supabase
    .from('special_dates')
    .insert({
      barbershop_id: barbershop?.id,
      date: testDate,
      is_holiday: true,
      reason: 'Test'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creando feriado:', error);
  } else {
    console.log('Feriado creado:', holiday);
    // Limpieza
    await supabase
      .from('special_dates')
      .delete()
      .eq('id', holiday.id);
  }
}

verificarEstado();
```

### Paso 3: Si necesitas actualizar el rol manualmente

Ejecutar en Supabase SQL Editor:

```sql
-- Asegurar que tu usuario tiene el rol correcto
UPDATE profiles 
SET role = 'owner' 
WHERE email = 'nicolascarrizook@gmail.com';

-- Verificar
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'nicolascarrizook@gmail.com';
```

## Verificación Final

1. La UI debe mostrar "Propietario" en el perfil
2. Debes poder crear/editar feriados sin errores
3. Si aún hay problemas, revisa la consola del navegador para más detalles