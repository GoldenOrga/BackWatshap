import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Attachment from '../src/models/Attachment.js';
import Message from '../src/models/Message.js';
import Conversation from '../src/models/Conversation.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import './test_helper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../public/uploads');

// Helper function to create temporary test files
const createTempFile = (content, filename = 'test.txt') => {
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}`);
    fs.writeFileSync(tempPath, content);
    return tempPath;
};

describe('API Tests - Media Routes (/api/media)', () => {
    let userA, userB;
    let authTokenA, authTokenB;
    let conversation, message;
    let testFilePath;
    let tempFiles = [];

    beforeEach(async () => {
        await User.deleteMany({});
        await Attachment.deleteMany({});
        await Message.deleteMany({});
        await Conversation.deleteMany({});

        // Créer les utilisateurs
        userA = await User.create({
            name: 'User A Media',
            email: 'usera_media@test.com',
            password: 'password123'
        });

        userB = await User.create({
            name: 'User B Media',
            email: 'userb_media@test.com',
            password: 'password123'
        });

        // Login et récupérer tokens
        const loginResA = await request(app)
            .post('/api/auth/login')
            .send({ email: 'usera_media@test.com', password: 'password123' });
        authTokenA = loginResA.body.accessToken;

        const loginResB = await request(app)
            .post('/api/auth/login')
            .send({ email: 'userb_media@test.com', password: 'password123' });
        authTokenB = loginResB.body.accessToken;

        // Créer une conversation
        conversation = await Conversation.create({
            participants: [userA._id, userB._id],
            createdBy: userA._id,
            creator: userA._id
        });

        // Créer un message
        message = await Message.create({
            sender: userA._id,
            conversation: conversation._id,
            conversationId: conversation._id,
            content: 'Test message with attachment',
            type: 'text'
        });

        // Créer un dossier uploads s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        tempFiles = [];
    });

    afterEach(async () => {
        // Nettoyer les fichiers temporaires
        tempFiles.forEach(tempFile => {
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (e) {
                // ignore
            }
        });

        // Nettoyer les fichiers uploadés
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    });

    // ==============================
    // POST /api/media/upload - Upload File
    // ==============================
    describe('POST /api/media/upload (Upload File)', () => {

        it('should upload a file successfully (201)', async () => {
            const originalName = 'test.pdf';
            const tempFile = createTempFile('test file content', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .field('conversationId', conversation._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body).to.have.property('filename');
            expect(res.body).to.have.property('url');
            expect(res.body.originalName).to.equal(originalName);
            expect(res.body.type).to.equal('file');
            expect(res.body.uploader).to.equal(userA._id.toString());
        });

        it('should upload an image successfully (200)', async () => {
            const originalName = 'image.png';
            const tempFile = createTempFile('fake image content', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('url');
            expect(res.body.originalName).to.equal(originalName);
            expect(res.body.filename).to.include('.png');
        });

        it('should upload a video successfully', async () => {
            const originalName = 'video.mp4';
            const tempFile = createTempFile('fake video content', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('video');
        });

        it('should upload an audio file successfully', async () => {
            const originalName = 'audio.mp3';
            const tempFile = createTempFile('fake audio content', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('audio');
        });

        it('should return 400 if no file is uploaded', async () => {
            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString());

            expect(res.statusCode).to.equal(400);
            expect(res.body.message).to.equal('Aucun fichier uploadé');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .post('/api/media/upload');

            expect(res.statusCode).to.equal(401);
        });

        // it('should reject files with disallowed MIME type', async () => {
        //     const originalName = 'malware.exe';
        //     const tempFile = createTempFile('malicious content', originalName);
        //     tempFiles.push(tempFile);

        //     const res = await request(app)
        //         .post('/api/media/upload')
        //         .set('Authorization', `Bearer ${authTokenA}`)
        //         .attach('file', tempFile, originalName);

        //     expect(res.statusCode).to.equal(400);
        // });

        it('should handle oversized files', async () => {
            const originalName = 'large.pdf';
            const tempDir = os.tmpdir();
            const tempPath = path.join(tempDir, `${Date.now()}-large-${Math.random().toString(36).substring(7)}.pdf`);
            
            // Créer un fichier de 51MB
            const stream = fs.createWriteStream(tempPath);
            const chunkSize = 1024 * 1024; // 1MB
            for (let i = 0; i < 51; i++) {
                stream.write(Buffer.alloc(chunkSize));
            }
            stream.end();
            
            await new Promise(resolve => stream.on('finish', resolve));
            tempFiles.push(tempPath);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .attach('file', tempPath, originalName);

            expect(res.statusCode).to.be.oneOf([400, 413, 500]);
        });

        it('should create attachment record in DB with messageId', async () => {
            const originalName = 'document.pdf';
            const tempFile = createTempFile('test content', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .field('conversationId', conversation._id.toString())
                .attach('file', tempFile, originalName);

            const attachment = await Attachment.findById(res.body._id);
            expect(attachment).to.exist;
            expect(attachment.message.toString()).to.equal(message._id.toString());
        });
    });

    // ==============================
    // GET /api/media/info/:fileId - Get File Info
    // ==============================
    describe('GET /api/media/info/:fileId (Get File Info)', () => {

        beforeEach(async () => {
            const originalName = 'info-test.pdf';
            const tempFile = createTempFile('test content', originalName);
            tempFiles.push(tempFile);

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(uploadRes.statusCode).to.equal(201);
            expect(uploadRes.body).to.have.property('_id');
            testFilePath = uploadRes.body._id;
        });

        // it('should retrieve file info successfully (200)', async () => {
        //     const res = await request(app)
        //         .get(`/api/media/info/${testFilePath}`)
        //         .set('Authorization', `Bearer ${authTokenA}`);

        //     expect(res.statusCode).to.equal(200);
        //     expect(res.body).to.have.property('originalName');
        //     expect(res.body).to.have.property('filename');
        //     expect(res.body).to.have.property('uploader');
        //     expect(res.body.uploader).to.have.property('name');
        // });

        // it('should return 404 for non-existent file', async () => {
        //     const fakeId = '507f1f77bcf86cd799439011';
        //     const res = await request(app)
        //         .get(`/api/media/info/${fakeId}`)
        //         .set('Authorization', `Bearer ${authTokenA}`);

        //     expect(res.statusCode).to.equal(404);
        //     expect(res.body.message).to.equal('Fichier non trouvé');
        // });

        // it('should populate uploader info', async () => {
        //     const res = await request(app)
        //         .get(`/api/media/info/${testFilePath}`)
        //         .set('Authorization', `Bearer ${authTokenA}`);

        //     expect(res.statusCode).to.equal(200);
        //     expect(res.body.uploader.name).to.equal('User A Media');
        // });
    });

    // ==============================
    // GET /api/media/download/:fileId - Download File
    // ==============================
    describe('GET /api/media/download/:fileId (Download File)', () => {

        beforeEach(async () => {
            const originalName = 'download-test.pdf';
            const tempFile = createTempFile('downloadable content', originalName);
            tempFiles.push(tempFile);

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(uploadRes.statusCode).to.equal(201);
            expect(uploadRes.body).to.have.property('_id');
            testFilePath = uploadRes.body._id;
        });

        it('should download file successfully (200)', async () => {
            const res = await request(app)
                .get(`/api/media/download/${testFilePath}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.headers['content-disposition']).to.include('download-test.pdf');
        });

        it('should return 404 for non-existent file', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .get(`/api/media/download/${fakeId}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(404);
        });

        // it('should return 404 if file missing from filesystem', async () => {
        //     const attachment = await Attachment.findById(testFilePath);
        //     const filePath = path.join(uploadsDir, attachment.filename);
        //     if (fs.existsSync(filePath)) {
        //         fs.unlinkSync(filePath);
        //     }

        //     const res = await request(app)
        //         .get(`/api/media/download/${testFilePath}`)
        //         .set('Authorization', `Bearer ${authTokenA}`);

        //     expect(res.statusCode).to.equal(404);
        //     expect(res.body.message).to.include('introuvable');
        // });
    });

    // ==============================
    // DELETE /api/media/:fileId - Delete File
    // ==============================
    describe('DELETE /api/media/:fileId (Delete File)', () => {

        beforeEach(async () => {
            const originalName = 'delete-test.pdf';
            const tempFile = createTempFile('content to delete', originalName);
            tempFiles.push(tempFile);

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(uploadRes.statusCode).to.equal(201);
            expect(uploadRes.body).to.have.property('_id');
            testFilePath = uploadRes.body._id;
        });

        it('should delete file successfully (200)', async () => {
            const res = await request(app)
                .delete(`/api/media/${testFilePath}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(200);
            expect(res.body.message).to.equal('Fichier supprimé avec succès');

            const attachment = await Attachment.findById(testFilePath);
            expect(attachment).to.be.null;
        });

        it('should return 404 if file not found', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .delete(`/api/media/${fakeId}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(res.statusCode).to.equal(404);
            expect(res.body.message).to.equal('Fichier non trouvé');
        });

        it('should return 403 if user is not the uploader', async () => {
            const res = await request(app)
                .delete(`/api/media/${testFilePath}`)
                .set('Authorization', `Bearer ${authTokenB}`);

            expect(res.statusCode).to.equal(403);
            expect(res.body.message).to.equal('Non autorisé');
        });

        it('should remove file from filesystem', async () => {
            const attachment = await Attachment.findById(testFilePath);
            const filePath = path.join(uploadsDir, attachment.filename);

            expect(fs.existsSync(filePath)).to.be.true;

            await request(app)
                .delete(`/api/media/${testFilePath}`)
                .set('Authorization', `Bearer ${authTokenA}`);

            expect(fs.existsSync(filePath)).to.be.false;
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .delete(`/api/media/${testFilePath}`);

            expect(res.statusCode).to.equal(401);
        });
    });

    // ==============================
    // File Type Detection Tests
    // ==============================
    describe('File Type Detection', () => {

        it('should detect JPEG images correctly', async () => {
            const originalName = 'photo.jpg';
            const tempFile = createTempFile('jpeg data', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('image');
        });

        it('should detect PNG images correctly', async () => {
            const originalName = 'image.png';
            const tempFile = createTempFile('png data', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('image');
        });

        it('should detect WebP images correctly', async () => {
            const originalName = 'image.webp';
            const tempFile = createTempFile('webp data', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('image');
        });

        it('should detect MP4 videos correctly', async () => {
            const originalName = 'movie.mp4';
            const tempFile = createTempFile('video data', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('video');
        });

        // it('should detect WAV audio correctly', async () => {
        //     const originalName = 'sound.wav';
        //     const tempFile = createTempFile('audio data', originalName);
        //     tempFiles.push(tempFile);

        //     const res = await request(app)
        //         .post('/api/media/upload')
        //         .set('Authorization', `Bearer ${authTokenA}`)
        //         .field('messageId', message._id.toString())
        //         .attach('file', tempFile, originalName);

        //     expect(res.statusCode).to.equal(201);
        //     expect(res.body.type).to.equal('audio');
        // });

        it('should detect PDF documents correctly', async () => {
            const originalName = 'document.pdf';
            const tempFile = createTempFile('pdf data', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.type).to.equal('file');
        });
    });

    // ==============================
    // Filename Sanitization Tests
    // ==============================
    describe('Filename Sanitization', () => {

        it('should sanitize filenames with special characters', async () => {
            const originalName = 'test@#$%.pdf';
            const tempFile = createTempFile('test', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.filename).to.not.include('@');
            expect(res.body.filename).to.not.include('#');
        });

        it('should sanitize filenames with accents', async () => {
            const originalName = 'café.pdf';
            const tempFile = createTempFile('test', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            expect(res.body.filename).to.not.include('é');
        });

        it('should generate unique filenames', async () => {
            const originalName = 'duplicate.pdf';
            const tempFile1 = createTempFile('test1', originalName);
            tempFiles.push(tempFile1);

            const res1 = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile1, originalName);

            const tempFile2 = createTempFile('test2', originalName);
            tempFiles.push(tempFile2);

            const res2 = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile2, originalName);

            expect(res1.body.filename).to.not.equal(res2.body.filename);
        });

        it('should preserve original filename in DB', async () => {
            const originalName = 'My Document.pdf';
            const tempFile = createTempFile('test', originalName);
            tempFiles.push(tempFile);

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${authTokenA}`)
                .field('messageId', message._id.toString())
                .attach('file', tempFile, originalName);

            expect(res.statusCode).to.equal(201);
            const attachment = await Attachment.findById(res.body._id);
            expect(attachment.originalName).to.equal(originalName);
        });
    });
});
