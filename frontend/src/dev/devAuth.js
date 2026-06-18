import api from '../services/api.js';

// Expose a DEV-only helper to programmatically log in and store tokens in localStorage.
// Usage (browser console): await window.__devLogin('identifier','password')
if (import.meta.env.DEV) {
  window.__devLogin = async (identifier, password) => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res?.data?.success) {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        // return user info
        return res.data.user || { message: 'logged in' };
      }
      throw new Error(res?.data?.error || 'Login failed');
    } catch (err) {
      console.error('Dev login failed', err);
      throw err;
    }
  };
}
