import supabase from '../config/supabase.js';

async function run() {
  const { data: gyms } = await supabase.from('gyms').select('*');
  console.log('ALL GYMS:');
  console.log(JSON.stringify(gyms, null, 2));

  const { data: users } = await supabase.from('users').select('id, email, first_name, last_name, phone');
  console.log('ALL USERS:');
  console.log(JSON.stringify(users, null, 2));

  const { data: sessions } = await supabase.from('sessions').select('*');
  console.log('ALL SESSIONS:');
  console.log(JSON.stringify(sessions, null, 2));
}

run();

