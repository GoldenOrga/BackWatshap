import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js'; // Ajuste le chemin
import User from '../src/models/User.js';

describe('API Tests - User Routes', () => {
  let authToken;
  let user1, user2;
  const initialPassword = 'password123';

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Création de 2 utilisateurs
    user1 = await User.create({ name: 'UserOne', email: 'user1@test.com', password: initialPassword, isOnline: true });
    user2 = await User.create({ name: 'UserTwo', email: 'user2@test.com', password: initialPassword, isOnline: false });

    // Connexion avec User1 pour obtenir le token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.com', password: initialPassword });
    
    authToken = res.body.accessToken;
  });

  // --- GET USERS ---
  describe('GET /api/users', () => {
    it('should return a list of users (excluding self)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      // User1 est connecté, il ne doit voir que User2
      expect(res.body.users).to.be.an('array');
      const ids = res.body.users.map(u => u._id);
      expect(ids).to.not.include(user1._id.toString());
    });

    it('should filter online users', async () => {
      // User2 est hors ligne, donc si on filtre online=true, on ne devrait rien recevoir (car User1 est exclu)
      const res = await request(app)
        .get('/api/users?online=true')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.users).to.be.an('array').that.is.empty;
    });
  });

  // --- GET PROFILE & SEARCH ---
  describe('GET /api/users/profile', () => {
    it('should return the logged-in user profile', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.email).to.equal('user1@test.com');
    });
  });

  describe('GET /api/users/search', () => {
    it('should find user by name', async () => {
      const res = await request(app)
        .get('/api/users/search?q=UserTwo')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body[0].name).to.equal('UserTwo');
    });

    it('should return 400 if q is missing', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).to.equal(400);
    });
  });

  // --- UPDATE PROFILE ---
  describe('PUT /api/users/profile', () => {
    it('should update name and avatar', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'UserOne Updated', avatar: 'http://newavatar.com' });
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('UserOne Updated');
    });

    it('should return 400 if body is empty', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(res.statusCode).to.equal(400);
    });
  });

  // --- CHANGE PASSWORD (AUTH) ---
  describe('POST /api/users/change-password', () => {
    it('should change password successfully', async () => {
      const newPass = 'newPass123';
      const res = await request(app)
        .post('/api/users/change-password') // Attention: ta route est /api/users/... dans userRoutes.js
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: initialPassword, newPassword: newPass });

      expect(res.statusCode).to.equal(200);

      // Vérifier que l'ancien mdp ne marche plus
      const loginFail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@test.com', password: initialPassword });
      expect(loginFail.statusCode).to.equal(401);

      // Vérifier que le nouveau marche
      const loginSuccess = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@test.com', password: newPass });
      expect(loginSuccess.statusCode).to.equal(200);
    });

    it('should fail if current password is wrong', async () => {
      const res = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'wrong', newPassword: 'new' });
      
      expect(res.statusCode).to.equal(401);
    });
  });

  // --- CHANGE PASSWORD BY EMAIL (NO AUTH) ---
  describe('POST /api/users/change-password/email', () => {
    it('should change password using email only', async () => {
      const newPass = 'resetPass123';
      const res = await request(app)
        .post('/api/users/change-password/email')
        .send({ email: 'user2@test.com', newPassword: newPass });

      expect(res.statusCode).to.equal(200);

      // Vérifier la connexion avec le nouveau mot de passe
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user2@test.com', password: newPass });
      expect(loginRes.statusCode).to.equal(200);
    });

    it('should fail if email not found', async () => {
      const res = await request(app)
        .post('/api/users/change-password/email')
        .send({ email: 'ghost@test.com', newPassword: 'abc' });
      expect(res.statusCode).to.equal(404);
    });

    it('should fail if new password is too short', async () => {
      const res = await request(app)
        .post('/api/users/change-password/email')
        .send({ email: 'user2@test.com', newPassword: '123' });
      expect(res.statusCode).to.equal(400);
    });
  });

  // --- DELETE ACCOUNT ---
  describe('DELETE /api/users/delete', () => {
    it('should delete account if password matches', async () => {
      const res = await request(app)
        .delete('/api/users/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: initialPassword });

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.include('supprimé');

      // Vérifier en DB
      const deletedUser = await User.findById(user1._id);
      expect(deletedUser).to.be.null;
    });

    it('should fail to delete if password is wrong', async () => {
      const res = await request(app)
        .delete('/api/users/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'wrong' });

      expect(res.statusCode).to.equal(401);
      
      // L'utilisateur doit toujours exister
      const user = await User.findById(user1._id);
      expect(user).to.not.be.null;
    });
  });

});