import request from 'supertest';
import app from '../src/app.js';

describe('API Health and Auth Endpoints', () => {
  it('should return 200 OK on health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad@credentials.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});
