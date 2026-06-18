import supabase from '../config/supabase.js';

async function run() {
  const { data, error } = await supabase
    .from('gyms')
    .update({
      owner_id: 'f5ec9f8d-c53e-4c20-9995-033eb55f663e',
      gym_name: 'ABC Fitness Studio'
    })
    .eq('id', '60916a67-7d4a-4c44-bb6a-d74c54354a81')
    .select();

  console.log('Update result:');
  if (error) console.error(error);
  else console.log(data);
}

run();
