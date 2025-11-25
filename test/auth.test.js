import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js'; // Ajuste le chemin selon ta structure
import User from '../src/models/User.js';

describe('API Tests - Auth Routes', () => {
  const userData = {
    name: 'John Doe',
    email: 'john@test.com',
    password: 'password123',
    avatar: 'avatar.png'
  };

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.have.property('accessToken');
      expect(res.body).to.have.property('refreshToken');
      expect(res.body.user).to.have.property('id');
      expect(res.body.user.email).to.equal(userData.email);
    });

    it('should fail if email already exists', async () => {
      await User.create(userData); // Créer l'user une première fois

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.equal('Email déjà utilisé');
    });

    it('should fail if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'No Email' });

      expect(res.statusCode).to.equal(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create(userData);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('accessToken');
      expect(res.body.user.isOnline).to.be.true;
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' });

      expect(res.statusCode).to.equal(401);
    });

    it('should fail if user does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@test.com', password: 'password123' });

      expect(res.statusCode).to.equal(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;

    beforeEach(async () => {
      await User.create(userData);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password });
      refreshToken = loginRes.body.refreshToken;
    });

    it('should generate a new access token with a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('accessToken');
    });

    it('should fail if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.statusCode).to.equal(401);
    });

    it('should fail if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid_token_string' });

      expect(res.statusCode).to.equal(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await User.create(userData);
      userId = user._id;
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password });
      authToken = loginRes.body.accessToken;
    });

    it('should logout successfully and set isOnline to false', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.include('Déconnexion réussie');

      // Vérifier en DB
      const user = await User.findById(userId);
      expect(user.isOnline).to.be.false;
      expect(user.lastLogout).to.not.be.null;
    });
  });
});