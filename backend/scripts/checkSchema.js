import supabase from '../src/config/supabase.js';

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('User keys:', Object.keys(data[0] || {}));
  }
}
check();
