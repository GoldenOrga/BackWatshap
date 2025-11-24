import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import User from '../src/models/User.js';
import './test_helper.js'; // Assure le nettoyage de la BDD avant chaque test

describe('API Tests - Authentication Routes', () => {

  // --- Tests pour la route d'inscription ---
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
      
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.have.property('accessToken');
      expect(res.body).to.have.property('user');
    });

    it('should return 400 if email is already used', async () => {
      // Crée un utilisateur au préalable
      await User.create({ name: 'Existing User', email: 'alice@test.com', password: 'password123' });
      
      // Tente de s'inscrire avec le même email
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

      expect(res.statusCode).to.equal(400);
    });

    it('should return 400 if a required field is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com' }); // Mot de passe manquant

      expect(res.statusCode).to.equal(400);
    });
  });

  // --- Tests pour la route de connexion ---
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        // Crée un utilisateur pour les tests de connexion
        await User.create({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
    });

    it('should log in an existing user and set them as online', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@test.com', password: 'password123' });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('accessToken');
      expect(res.body.user).to.have.property('name');
      expect(res.body.user.name).to.equal('Alice');

      // Vérifie que l'utilisateur est bien marqué comme en ligne dans la BDD
      const userInDb = await User.findOne({ email: 'alice@test.com' });
      expect(userInDb.isOnline).to.be.true;
    });

    it('should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@test.com', password: 'wrongpassword' });

      expect(res.statusCode).to.equal(401);
    });

    it('should fail login with a non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(res.statusCode).to.equal(401);
    });
  });

  // --- Tests pour la route de déconnexion ---
  describe('POST /api/auth/logout', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
        // Crée un utilisateur et le connecte pour obtenir un token valide
        const user = await User.create({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com', password: 'password123' });
        
        authToken = res.body.accessToken;
        userId = user._id;
    });
    
    it('should log out an authenticated user and set them as offline', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).to.equal(200);

        // Vérifie que l'utilisateur est bien marqué comme hors ligne
        const userInDb = await User.findById(userId);
        expect(userInDb.isOnline).to.be.false;
        expect(userInDb.lastLogout).to.be.a('date');
    });

    it('should return 401 if no token is provided', async () => {
        const res = await request(app)
            .post('/api/auth/logout'); // Pas de header d'autorisation

        expect(res.statusCode).to.equal(401);
    });

    it('should return 401 if the token is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', 'Bearer invalidtoken');

        expect(res.statusCode).to.equal(401);
    });
  });
});