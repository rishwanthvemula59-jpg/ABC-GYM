import supabase from '../src/config/supabase.js';

async function updatePhone() {
  const { data, error } = await supabase
    .from('users')
    .update({ phone: '6281042207' })
    .eq('email', 'owner@abcfitness.com')
    .select();

  if (error) {
    console.error('Error updating phone number:', error.message);
  } else {
    console.log('Successfully updated phone number for owner@abcfitness.com:', data[0]);
  }
}
updatePhone();
