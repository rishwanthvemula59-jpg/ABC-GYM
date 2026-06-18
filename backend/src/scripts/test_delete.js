import axios from 'axios';
import supabase from '../config/supabase.js';

async function run() {
  // Find Jane Doe's ID
  const { data: members } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('gym_id', '60916a67-7d4a-4c44-bb6a-d74c54354a81')
    .eq('full_name', 'Jane Doe');

  if (!members || members.length === 0) {
    console.log('Jane Doe not found in DB');
    return;
  }

  const memberId = members[0].id;
  console.log(`Found Jane Doe with ID: ${memberId}`);

  // Get a valid session token for owner@abcfitness.com
  const { data: sessions } = await supabase
    .from('sessions')
    .select('token')
    .eq('user_id', 'f5ec9f8d-c53e-4c20-9995-033eb55f663e')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('No active session found for owner');
    return;
  }

  const token = sessions[0].token;
  console.log('Using token:', token.substring(0, 20) + '...');

  try {
    const response = await axios.delete(`http://localhost:3001/api/members/60916a67-7d4a-4c44-bb6a-d74c54354a81/${memberId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error executing delete request:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

run();
