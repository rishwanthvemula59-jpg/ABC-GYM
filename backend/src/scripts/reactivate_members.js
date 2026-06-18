import supabase from '../config/supabase.js';

async function run() {
  const { data, error } = await supabase
    .from('members')
    .update({ is_active: true })
    .eq('gym_id', '60916a67-7d4a-4c44-bb6a-d74c54354a81')
    .select();

  console.log('Reactivation result:');
  if (error) console.error(error);
  else console.log(`Reactivated ${data.length} members`);
}

run();
