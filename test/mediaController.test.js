// tests/mediaController.test.js
import request from 'supertest';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Message from '../src/models/Message.js';
import Attachment from '../src/models/Attachment.js';
import './test_helper.js'; // Nettoyage global
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');


describe('API Tests - Media Routes (/api/media)', () => {
  let userA, userB, authTokenA, message;

  beforeEach(async () => {
    await User.deleteMany({});
    await Message.deleteMany({});
    await Attachment.deleteMany({});

    userA = await User.create({
      name: 'User A',
      email: 'usera@media.com',
      password: 'password123'
    });

    userB = await User.create({
      name: 'User B',
      email: 'userb@media.com',
      password: 'password123'
    });

    // Login User A
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usera@media.com', password: 'password123' });

    authTokenA = loginRes.body.accessToken;

    // Créer un message
    message = await Message.create({
      sender: userA._id,
      receiver: userB._id,
      conversation: new mongoose.Types.ObjectId(),
      content: 'Hello'
    });

    // Créer dossier uploads si absent
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  // ------------------------------
  // POST /api/media/upload
  // ------------------------------
  describe('POST /api/media/upload', () => {
    it('should upload a valid image file', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authTokenA}`)
        .field('messageId', message._id.toString())
        .attach('file', path.join(__dirname, 'fixtures/test-image.png'));

      expect(res.statusCode).to.equal(201);
      expect(res.body.originalName).to.equal('test-image.png');

      // Vérifier que le fichier existe
      const uploadedPath = path.join(uploadsDir, res.body.filename);
      expect(fs.existsSync(uploadedPath)).to.be.true;
    });

    it('should return 400 for missing file', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authTokenA}`)
        .field('messageId', message._id.toString());

      expect(res.statusCode).to.equal(400);
    });

    it('should return 400 for invalid mimetype', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authTokenA}`)
        .field('messageId', message._id.toString())
        .attach('file', path.join(__dirname, 'fixtures/test-invalid.txt'));

      expect(res.statusCode).to.equal(400);
    });
  });

  // ------------------------------
  // GET /api/media/:fileId
  // ------------------------------
  describe('GET /api/media/:fileId (getFileInfo)', () => {
    let attachment;

    beforeEach(async () => {
      attachment = await Attachment.create({
        message: message._id,
        uploader: userA._id,
        originalName: 'file.png',
        filename: 'file.png',
        mimetype: 'image/png',
        size: 1234,
        url: '/uploads/file.png',
        type: 'image'
      });
    });

    it('should return file info', async () => {
      const res = await request(app)
        .get(`/api/media/${attachment._id}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.originalName).to.equal('file.png');
    });

    it('should return 404 if file not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ------------------------------
  // GET /api/media/download/:fileId
  // ------------------------------
  describe('GET /api/media/download/:fileId', () => {
    let attachment;

    beforeEach(async () => {
      attachment = await Attachment.create({
        message: message._id,
        uploader: userA._id,
        originalName: 'file.png',
        filename: 'file.png',
        mimetype: 'image/png',
        size: 1234,
        url: '/uploads/file.png',
        type: 'image'
      });

      // Créer le fichier physique
      fs.writeFileSync(path.join(uploadsDir, 'file.png'), 'dummy');
    });

    it('should download the file', async () => {
      const res = await request(app)
        .get(`/api/media/download/${attachment._id}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-disposition']).to.include('file.png');
    });

    it('should return 404 if file missing', async () => {
      fs.unlinkSync(path.join(uploadsDir, 'file.png')); // supprimer

      const res = await request(app)
        .get(`/api/media/download/${attachment._id}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ------------------------------
  // DELETE /api/media/:fileId
  // ------------------------------
  describe('DELETE /api/media/:fileId', () => {
    let attachment;

    beforeEach(async () => {
      attachment = await Attachment.create({
        message: message._id,
        uploader: userA._id,
        originalName: 'file.png',
        filename: 'file.png',
        mimetype: 'image/png',
        size: 1234,
        url: '/uploads/file.png',
        type: 'image'
      });

      fs.writeFileSync(path.join(uploadsDir, 'file.png'), 'dummy');
    });

    it('should delete file if uploader', async () => {
      const res = await request(app)
        .delete(`/api/media/${attachment._id}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal('Fichier supprimé avec succès');
      expect(fs.existsSync(path.join(uploadsDir, 'file.png'))).to.be.false;
    });

    it('should return 403 if not uploader', async () => {
      const loginB = await request(app)
        .post('/api/auth/login')
        .send({ email: 'userb@media.com', password: 'password123' });

      const tokenB = loginB.body.accessToken;

      const res = await request(app)
        .delete(`/api/media/${attachment._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.statusCode).to.equal(403);
    });

    it('should return 404 if file not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(res.statusCode).to.equal(404);
    });
  });
});
