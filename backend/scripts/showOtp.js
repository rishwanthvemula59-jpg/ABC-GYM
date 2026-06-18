import supabase from '../src/config/supabase.js';

async function showOtp() {
  const { data, error } = await supabase
    .from('users')
    .select('email, reset_otp, reset_otp_expires_at')
    .eq('email', 'owner@abcfitness.com')
    .maybeSingle();

  if (error) {
    console.error('Error fetching OTP:', error.message);
  } else if (!data) {
    console.log('No user found with email owner@abcfitness.com');
  } else {
    console.log('--- OTP Code Details ---');
    console.log('Email:', data.email);
    console.log('Active OTP:', data.reset_otp);
    console.log('Expires At:', data.reset_otp_expires_at);
  }
}
showOtp();
