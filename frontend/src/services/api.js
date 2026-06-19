import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  // In development, optionally avoid sending Authorization for attendance GET requests
  // when VITE_ALLOW_DEV_PUBLIC_ATTENDANCE is enabled. This mirrors backend opt-in behavior.
  const isDev = import.meta.env.DEV;
  const allowDevPublic = import.meta.env.VITE_ALLOW_DEV_PUBLIC_ATTENDANCE === 'true';
  if (token && !(isDev && allowDevPublic && config.method === 'get' && config.url && config.url.includes('/attendance/'))) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, err => Promise.reject(err));

api.interceptors.response.use(res => res, async (err) => {
  const orig = err.config;
  // Handle access denied globally and surface a friendly message in the UI
  if (err.response?.status === 403) {
    try {
      if (window.location.pathname.includes('/checkin')) {
        return Promise.reject(err);
      }
      const msg = err.response?.data?.error || 'Access denied: you are not authorized to access this studio.';
      localStorage.setItem('accessError', msg);
      const localId = localStorage.getItem('studioId');
      if (localId) {
        window.location.href = `/dashboard/${localId}`;
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(err);
  }
  if (err.response?.status === 401 && !orig._retry && !orig.url.includes('login') && !orig.url.includes('register')) {
    if (window.location.pathname.includes('/checkin')) {
      return Promise.reject(err);
    }
    orig._retry = true;
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh-token`, {
        refreshToken: localStorage.getItem('refreshToken')
      });
      localStorage.setItem('accessToken', data.accessToken);
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch {
      localStorage.clear();
      if (!window.location.pathname.includes('/checkin')) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(err);
});

export default api;