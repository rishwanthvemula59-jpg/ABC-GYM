import supabase from '/Users/rishwanthvemula/Downloads/gym-management-system/gym-management-system/backend/src/validators/ABC/backend/src/config/supabase.js';

async function checkOtps() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, phone, role, reset_otp, reset_otp_expires_at');
  console.log('All users:', data);
  console.log('Error:', error);
}

checkOtps();
