import axios from 'axios';

async function run() {
  try {
    console.log('Attempting login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      identifier: 'owner@abcfitness.com',
      password: 'Test@1234'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('Login successful. Token:', token.substring(0, 20) + '...');

    const response = await axios.get('http://localhost:3001/api/dashboard/60916a67-7d4a-4c44-bb6a-d74c54354a81', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
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
