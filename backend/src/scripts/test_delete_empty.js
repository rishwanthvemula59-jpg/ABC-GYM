import axios from 'axios';
import supabase from '../config/supabase.js';

async function run() {
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

  try {
    const response = await axios.delete(`http://localhost:3001/api/members/60916a67-7d4a-4c44-bb6a-d74c54354a81`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Response:', response.status, response.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

run();
