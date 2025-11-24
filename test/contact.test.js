import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Contact from '../src/models/Contact.js';
import mongoose from 'mongoose';
import './test_helper.js'; // Nettoyage global

describe('API Tests - Contact Routes (/api/contacts)', () => {
    let userA, userB, userC;
    let authTokenA;

    // Reset COMPLET de la DB avant chaque describe
    beforeEach(async () => {
        await User.deleteMany({});
        await Contact.deleteMany({});

        // recréer les utilisateurs
        userA = await User.create({
            name: 'Tester A',
            email: 'tester_a@contact.com',
            password: 'password123'
        });

        userB = await User.create({
            name: 'Tester B',
            email: 'tester_b@contact.com',
            password: 'password123'
        });

        userC = await User.create({
            name: 'Tester C Target',
            email: 'tester_c@contact.com',
            password: 'password123'
        });

        // login user A pour token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'tester_a@contact.com', password: 'password123' });

        authTokenA = loginRes.body.accessToken;
    });

    // ------------------------------
    // POST /api/contacts
    // ------------------------------
    describe('POST /api/contacts (Add Contact)', () => {

        it('should successfully add a new contact (201)', async () => {
            const res = await request(app)
                .post('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`)
                .send({ contactId: userB._id });

            expect(res.statusCode).to.equal(201);
            expect(res.body.user).to.equal(userA._id.toString());
            expect(res.body.contact.name).to.equal('Tester B');
        });

        it('should return 400 if the contact already exists', async () => {
            // First create contact
            await Contact.create({ user: userA._id, contact: userB._id, status: 'accepted' });

            const res = await request(app)
                .post('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`)
                .send({ contactId: userB._id });

            expect(res.statusCode).to.equal(400);
            expect(res.body.message).to.equal('Contact déjà existant');
        });

        it("should return 400 if user tries to add themselves", async () => {
            const res = await request(app)
                .post('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`)
                .send({ contactId: userA._id });

            expect(res.statusCode).to.equal(400);
            expect(res.body.message).to.equal('Vous ne pouvez pas vous ajouter comme contact');
        });

        it("should return 404 if the contact user is not found", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`)
                .send({ contactId: fakeId });

            expect(res.statusCode).to.equal(404);
            expect(res.body.message).to.equal('Utilisateur non trouvé');
        });

        it("should return 400/500 for invalid ObjectId", async () => {
            const res = await request(app)
                .post('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`)
                .send({ contactId: "INVALID_ID" });

            expect(res.statusCode).to.be.oneOf([400, 500]);
        });

        it("should return 401 without token", async () => {
            const res = await request(app)
                .post('/api/contacts')
                .send({ contactId: userB._id });

            expect(res.statusCode).to.equal(401);
        });
    });

    // ------------------------------
    // GET /api/contacts
    // ------------------------------
    describe('GET /api/contacts (Get Contacts)', () => {

        beforeEach(async () => {
            await Contact.create({
                user: userA._id,
                contact: userB._id,
                status: 'accepted'
            });

            await Contact.create({
                user: userA._id,
                contact: userC._id,
                status: 'blocked',
                isBlocked: true
            });
        });

        it("should return accepted contacts only", async () => {
            const res = await request(app)
                .get('/api/contacts')
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].contact.name).to.equal('Tester B');
        });

        it("should return blocked contacts with status=blocked", async () => {
            const res = await request(app)
                .get('/api/contacts?status=blocked')
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].contact.name).to.equal('Tester C Target');
        });
    });

    // ------------------------------
    // DELETE /api/contacts/:id
    // ------------------------------
    describe('DELETE /api/contacts/:contactId', () => {

        beforeEach(async () => {
            await Contact.create({
                user: userA._id,
                contact: userB._id,
                status: 'accepted'
            });
        });

        it("should delete an existing contact", async () => {
            const res = await request(app)
                .delete(`/api/contacts/${userB._id}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body.message).to.equal('Contact supprimé');
        });

        it("should return 404 if already removed", async () => {
            await Contact.deleteMany({});

            const res = await request(app)
                .delete(`/api/contacts/${userB._id}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(404);
        });
    });

    // ------------------------------
    // BLOCK / UNBLOCK
    // ------------------------------
    describe('POST /api/contacts/block/:id', () => {
        it("should block a user", async () => {
            const res = await request(app)
                .post(`/api/contacts/block/${userB._id}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);

            const entry = await Contact.findOne({ user: userA._id, contact: userB._id });
            expect(entry.isBlocked).to.equal(true);
        });
    });

    describe('POST /api/contacts/unblock/:id', () => {

        beforeEach(async () => {
            await Contact.create({
                user: userA._id,
                contact: userB._id,
                status: 'blocked',
                isBlocked: true
            });
        });

        it("should unblock a user successfully", async () => {
            const res = await request(app)
                .post(`/api/contacts/unblock/${userB._id}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
        });

        it("should return 404 if not blocked", async () => {
            await Contact.updateOne(
                { user: userA._id, contact: userB._id },
                { isBlocked: false, status: 'accepted' }
            );

            const res = await request(app)
                .post(`/api/contacts/unblock/${userB._id}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(404);
        });
    });

    // ------------------------------
    // SEARCH
    // ------------------------------
    describe('GET /api/contacts/search', () => {

        beforeEach(async () => {
            await Contact.create({
                user: userA._id,
                contact: userC._id,
                status: 'accepted'
            });
        });

        it("should return matching contacts", async () => {
            const res = await request(app)
                .get('/api/contacts/search?q=Target')
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body.length).to.equal(1);
        });

        it("should return 400 if 'q' missing", async () => {
            const res = await request(app)
                .get('/api/contacts/search')
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(400);
        });

    });
});
