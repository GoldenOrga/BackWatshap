import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose'; 
import app from '../src/app.js';
import User from '../src/models/User.js';
import './test_helper.js'; 

describe('API Tests - User Routes (Full Coverage)', () => {
  let authToken;
  let user1, user2;

  
  beforeEach(async () => {
    user1 = await User.create({ name: 'UserOne', email: 'user1@test.com', password: 'password123', isOnline: true });
    user2 = await User.create({ name: 'UserTwo', email: 'user2@test.com', password: 'password123', isOnline: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.com', password: 'password123' });
    
    authToken = res.body.token;
  });

  
  describe('GET /api/users', () => {
    it('should return a list of all users with their avatar', async () => { // MODIFIÉ : Le nom du test
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.users).to.be.an('array').with.lengthOf(2);
      expect(res.body.users[0]).to.not.have.property('password');
      // AJOUTÉ : Vérifier que le champ avatar est présent
      expect(res.body.users[0]).to.have.property('avatar');
      expect(res.body.users[0].avatar).to.be.a('string');
    });

    it('should filter for online users when ?online=true is provided', async () => {
        const res = await request(app)
          .get('/api/users?online=true')
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(res.statusCode).to.equal(200);
        expect(res.body.users).to.be.an('array').with.lengthOf(1);
        expect(res.body.users[0].name).to.equal('UserOne'); 
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).to.equal(401);
    });
  });

  
  describe('GET /api/users/:id', () => {
    it('should return a single user profile with avatar', async () => { // MODIFIÉ : Le nom du test
      const res = await request(app)
        .get(`/api/users/${user2._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('UserTwo');
      // AJOUTÉ : Vérifier que le champ avatar est présent
      expect(res.body).to.have.property('avatar');
    });

    it('should return 404 for a non-existent user id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(404);
    });
  });

  
  describe('PUT /api/users/profile', () => {
    it("should update the authenticated user's name", async () => { // MODIFIÉ : Rendu plus spécifique
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'UserOneUpdated' });
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.name).to.equal('UserOneUpdated');

      const updatedUser = await User.findById(user1._id);
      expect(updatedUser.name).to.equal('UserOneUpdated');
    });

    // AJOUTÉ : Test spécifique pour la mise à jour de l'avatar
    it("should update the authenticated user's avatar", async () => {
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ avatar: newAvatarUrl });
      
      expect(res.statusCode).to.equal(200);
      expect(res.body.avatar).to.equal(newAvatarUrl);

      const updatedUser = await User.findById(user1._id);
      expect(updatedUser.avatar).to.equal(newAvatarUrl);
    });

    it('should return 400 if no fields are provided for update', async () => {
        const res = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({}); 
        
        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal("Aucun champ à mettre à jour");
    });
  });

  
  describe('GET /api/users/search', () => {
    it('should return users matching the search query with their avatar', async () => { // MODIFIÉ : Le nom du test
      const res = await request(app)
        .get('/api/users/search?q=Two') 
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array').with.lengthOf(1);
      expect(res.body[0].name).to.equal('UserTwo');
      // AJOUTÉ : Vérifier que le champ avatar est présent dans les résultats de recherche
      expect(res.body[0]).to.have.property('avatar');
    });

    it('should return 400 if search query "q" is missing', async () => {
      const res = await request(app)
        .get('/api/users/search') 
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.equal("Le paramètre de recherche 'q' est manquant");
    });
  });
});