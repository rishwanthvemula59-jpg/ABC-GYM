import supabase from '../config/supabase.js';
import { generateToken } from '../utils/cryptoUtils.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  const userId = 'f5ec9f8d-c53e-4c20-9995-033eb55f663e';
  const gymId = '60916a67-7d4a-4c44-bb6a-d74c54354a81';

  const token = generateToken({ userId, gymId });
  console.log('Generated token:', token.substring(0, 20) + '...');

  const sessionId = uuidv4();
  const { error } = await supabase.from('sessions').insert({
    id: sessionId,
    user_id: userId,
    gym_id: gymId,
    token: token,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  if (error) {
    console.error('Error inserting session:', error);
    return;
  }
  console.log('Session inserted successfully');

  try {
    const response = await axios.get(`http://localhost:3001/api/dashboard/${gymId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error executing request:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

run();
