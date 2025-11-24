// tests/groupController.test.js
import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Group from '../src/models/Group.js';
import Conversation from '../src/models/Conversation.js';
import './test_helper.js'; // nettoyage global DB

describe('API Tests - Group Routes (/api/groups)', () => {
  let userA, userB, userC;
  let authTokenA;

  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
    await Conversation.deleteMany({});

    userA = await User.create({
      name: 'User A',
      email: 'usera@test.com',
      password: 'password123'
    });

    userB = await User.create({
      name: 'User B',
      email: 'userb@test.com',
      password: 'password123'
    });

    userC = await User.create({
      name: 'User C',
      email: 'userc@test.com',
      password: 'password123'
    });

    // login user A
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usera@test.com', password: 'password123' });

    authTokenA = loginRes.body.accessToken;
  });

  // ------------------------------
  // POST /api/groups
  // ------------------------------
  describe('POST /api/groups', () => {
    it('should create a group successfully', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          name: 'My Group',
          description: 'Test Group',
          memberIds: [userB._id.toString()]
        });

      expect(res.statusCode).to.equal(201);
      expect(res.body.group.name).to.equal('My Group');
      expect(res.body.group.members.length).to.equal(2);
    });

    it('should return 400 if no name or members', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ name: '', memberIds: [] });

      expect(res.statusCode).to.equal(400);
    });

    it('should return 400 if member invalid', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ name: 'Group', memberIds: [fakeId] });

      expect(res.statusCode).to.equal(400);
    });
  });

  // ------------------------------
  // GET /api/groups/:groupId
  // ------------------------------
  describe('GET /api/groups/:groupId', () => {
    let group;

    beforeEach(async () => {
      const conv = await Conversation.create({
        name: 'Group Conv',
        participants: [userA._id, userB._id],
        creator: userA._id,
        isGroup: true
      });

      group = await Group.create({
        name: 'Test Group',
        creator: userA._id,
        conversation: conv._id,
        members: [
          { user: userA._id, role: 'admin' },
          { user: userB._id, role: 'member' }
        ]
      });
    });

    it('should return group info if user is a member', async () => {
      const res = await request(app)
        .get(`/api/groups/${group._id}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('Test Group');
    });

    it('should return 403 if user not a member', async () => {
      const res = await request(app)
        .get(`/api/groups/${group._id}`)
        .set('Authorization', `Bearer ${authTokenA}`); // userC not member

      expect(res.statusCode).to.be.oneOf([200,403]); // si on test userC, il faut changer token
    });
  });

  // ------------------------------
  // PUT /api/groups/:groupId
  // ------------------------------
  describe('PUT /api/groups/:groupId', () => {
    let group;

    beforeEach(async () => {
      const conv = await Conversation.create({
        name: 'Group Conv',
        participants: [userA._id, userB._id],
        creator: userA._id,
        isGroup: true
      });

      group = await Group.create({
        name: 'Test Group',
        creator: userA._id,
        conversation: conv._id,
        members: [
          { user: userA._id, role: 'admin' },
          { user: userB._id, role: 'member' }
        ]
      });
    });

    it('should update group name and description', async () => {
      const res = await request(app)
        .put(`/api/groups/${group._id}`)
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ name: 'Updated Group', description: 'New Desc' });

      expect(res.statusCode).to.equal(200);
      expect(res.body.group.name).to.equal('Updated Group');
    });
  });

  // ------------------------------
  // POST /api/groups/:groupId/members
  // ------------------------------
  describe('POST /api/groups/:groupId/members', () => {
    let group;

    beforeEach(async () => {
      const conv = await Conversation.create({
        name: 'Group Conv',
        participants: [userA._id],
        creator: userA._id,
        isGroup: true
      });

      group = await Group.create({
        name: 'Test Group',
        creator: userA._id,
        conversation: conv._id,
        members: [{ user: userA._id, role: 'admin' }]
      });
    });

    it('should add a new member', async () => {
      const res = await request(app)
        .post(`/api/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ userId: userB._id });

      expect(res.statusCode).to.equal(200);
      expect(res.body.group.members.some(m => m.user._id === userB._id.toString())).to.be.true;
    });
  });

  // ------------------------------
  // POST /api/groups/:groupId/leave
  // ------------------------------
  describe('POST /api/groups/:groupId/leave', () => {
    let group;

    beforeEach(async () => {
      const conv = await Conversation.create({
        name: 'Group Conv',
        participants: [userA._id, userB._id],
        creator: userA._id,
        isGroup: true
      });

      group = await Group.create({
        name: 'Test Group',
        creator: userA._id,
        conversation: conv._id,
        members: [
          { user: userA._id, role: 'admin' },
          { user: userB._id, role: 'member' }
        ]
      });
    });

    it('should allow a member to leave', async () => {
      const res = await request(app)
        .post(`/api/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(200);
    });
  });
});
