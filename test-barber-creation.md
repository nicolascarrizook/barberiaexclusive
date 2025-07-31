# Testing Barber Creation

## Test Steps

1. **Open the app**: http://localhost:5175/
2. **Login as owner**: Use your owner account credentials
3. **Navigate to barbers**: Go to Dashboard → Gestionar barberos
4. **Click "Agregar barbero"**: This should open the creation dialog
5. **Test Manual Creation**:
   - Click the "Crear acceso manual" tab
   - Fill in the barber details:
     - Name: Test Barber
     - Bio: Test bio
     - Years of experience: 5
     - Commission: 50%
     - Specialties: Corte clásico, Fade
     - Instagram: testbarber
     - Enable "Acepta propinas"
   - Click "Crear barbero"
   
6. **Expected Result**:
   - Success message: "Barbero creado"
   - Invitation code displayed (6 characters)
   - Registration URL shown
   - Ability to copy both code and URL

## Verification

After creating the barber, check in Supabase:

1. **barber_invitations** table should have a new row with:
   - invitation_type: 'manual'
   - status: 'pending'
   - invitation_code: 6-character code

2. **provisional_barbers** table should have a new row with:
   - All the barber details entered
   - Linked to the invitation via invitation_id

## Next Steps

Once testing is successful:
1. Implement the barber onboarding page at `/barber/onboarding`
2. Test the full registration flow with the invitation code
3. Set up email sending for email invitations (optional)