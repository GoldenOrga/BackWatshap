// test/sessionController.test.js
import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import './test_helper.js'; // reset global DB si tu as ce helper

describe('API Tests - Session Routes (/api/sessions)', () => {
  let user;
  let authToken;

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});

    user = await User.create({
      name: 'Session Tester',
      email: 'session@test.com',
      password: 'password123'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });

    authToken = loginRes.body.accessToken;
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceName: 'PC Test' });

      expect(res.statusCode).to.equal(201);
      expect(res.body.deviceName).to.equal('PC Test');
      expect(res.body.user).to.equal(user._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/sessions').send({ deviceName: 'Test' });
      expect(res.statusCode).to.equal(401);
    });
  });

  describe('GET /api/sessions', () => {
    beforeEach(async () => {
      await Session.create({ user: user._id, deviceName: 'PC A', ipAddress: '1.1.1.1', expiresAt: new Date(Date.now() + 10000) });
      await Session.create({ user: user._id, deviceName: 'PC B', ipAddress: '2.2.2.2', expiresAt: new Date(Date.now() + 10000), isActive: false });
    });

    it('should return active sessions only', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.length).to.equal(1);
      expect(res.body[0].deviceName).to.equal('PC A');
    });
  });

  describe('GET /api/sessions/history', () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await Session.create({ user: user._id, deviceName: `Device ${i}`, expiresAt: new Date(Date.now() + 10000) });
      }
    });

    it('should return paginated session history', async () => {
      const res = await request(app)
        .get('/api/sessions/history?page=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.sessions.length).to.be.at.most(20);
      expect(res.body.currentPage).to.equal(2);
      expect(res.body.totalPages).to.be.at.least(2);
    });
  });

  describe('DELETE /api/sessions/:sessionId', () => {
    let session;

    beforeEach(async () => {
      session = await Session.create({ user: user._id, deviceName: 'PC Delete', expiresAt: new Date(Date.now() + 10000) });
    });

    it('should terminate a session', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${session._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal('Session terminée avec succès');

      const s = await Session.findById(session._id);
      expect(s.isActive).to.equal(false);
    });

    it('should return 404 for invalid session', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(404);
    });
  });

  describe('POST /api/sessions/terminate-all', () => {
    beforeEach(async () => {
      await Session.create({ user: user._id, deviceName: 'PC1', expiresAt: new Date(Date.now() + 10000) });
      await Session.create({ user: user._id, deviceName: 'PC2', expiresAt: new Date(Date.now() + 10000) });
    });

    it('should terminate all sessions', async () => {
      const res = await request(app)
        .post('/api/sessions/terminate-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal('Toutes les sessions ont été terminées');

      const sessions = await Session.find({ user: user._id });
      expect(sessions.every(s => s.isActive === false)).to.be.true;
    });
  });

  describe('POST /api/sessions/terminate-others', () => {
    let sessionA, sessionB;

    beforeEach(async () => {
      sessionA = await Session.create({ user: user._id, deviceName: 'PC A', expiresAt: new Date(Date.now() + 10000) });
      sessionB = await Session.create({ user: user._id, deviceName: 'PC B', expiresAt: new Date(Date.now() + 10000) });
    });

    it('should terminate all other sessions', async () => {
      const res = await request(app)
        .post('/api/sessions/terminate-others')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentSessionId: sessionA._id });

      expect(res.statusCode).to.equal(200);
      const sA = await Session.findById(sessionA._id);
      const sB = await Session.findById(sessionB._id);
      expect(sA.isActive).to.equal(true);
      expect(sB.isActive).to.equal(false);
    });

    it('should return 400 without currentSessionId', async () => {
      const res = await request(app)
        .post('/api/sessions/terminate-others')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).to.equal(400);
    });
  });

  describe('GET /api/sessions/devices', () => {
    beforeEach(async () => {
      await Session.create({ user: user._id, deviceName: 'Device Active', expiresAt: new Date(Date.now() + 10000) });
    });

    it('should return active devices', async () => {
      const res = await request(app)
        .get('/api/sessions/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.length).to.be.at.least(1);
      expect(res.body[0]).to.have.property('deviceName');
    });
  });
});
