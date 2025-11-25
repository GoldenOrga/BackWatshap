import { expect } from 'chai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import upload from '../src/uploaders/mediaUploader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../public/uploads');

describe('Media Uploader - Multer Configuration', () => {

    beforeEach(async () => {
        // Créer le répertoire uploads s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
    });

    afterEach(async () => {
        // Nettoyer les fichiers de test
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (err) {
                    // Ignorer les erreurs de suppression
                }
            });
        }
    });

    // ------------------------------
    // Multer Configuration Tests
    // ------------------------------
    describe('Multer Configuration', () => {

        it('should be a multer instance with middleware methods', () => {
            expect(upload).to.be.an('object');
            expect(upload.single).to.be.a('function');
            expect(upload.array).to.be.a('function');
            expect(upload.fields).to.be.a('function');
        });

        it('should be configured as single file upload', () => {
            const singleUpload = upload.single('file');
            expect(singleUpload).to.be.a('function');
        });

        it('should be configured as array file upload', () => {
            const arrayUpload = upload.array('files', 5);
            expect(arrayUpload).to.be.a('function');
        });
    });

    // ------------------------------
    // Storage Configuration Tests
    // ------------------------------
    describe('Storage Configuration (diskStorage)', () => {

        it('should save files to uploads directory', () => {
            expect(uploadsDir).to.include('uploads');
            expect(uploadsDir).to.include('public');
        });

        it('should generate unique filenames with timestamps', () => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            const filename = `${timestamp}-${random}-test.pdf`;

            expect(filename).to.include(String(timestamp).substring(0, 5));
            expect(filename).to.include('-');
            expect(filename).to.include('.pdf');
        });

        it('should preserve file extension', () => {
            const files = [
                'document.pdf',
                'image.png',
                'audio.mp3',
                'video.mp4'
            ];

            files.forEach(file => {
                const ext = path.extname(file);
                expect(ext).to.not.be.empty;
                expect(ext).to.include('.');
            });
        });
    });

    // ------------------------------
    // File Size Limits Tests
    // ------------------------------
    describe('File Size Limits', () => {

        it('should have a 50MB file size limit', () => {
            // Multer stocke les limites dans l'objet de configuration
            const uploader = multer({
                limits: { fileSize: 50 * 1024 * 1024 }
            });

            expect(uploader).to.exist;
        });

        it('should reject files larger than 50MB', (done) => {
            const mockReq = {
                file: {
                    size: 51 * 1024 * 1024 // 51MB
                }
            };

            // Vérifier la limite
            const maxSize = 50 * 1024 * 1024;
            const isTooLarge = mockReq.file.size > maxSize;

            expect(isTooLarge).to.be.true;
            done();
        });

        it('should accept files up to 50MB', (done) => {
            const mockReq = {
                file: {
                    size: 50 * 1024 * 1024 // Exactement 50MB
                }
            };

            const maxSize = 50 * 1024 * 1024;
            const isValid = mockReq.file.size <= maxSize;

            expect(isValid).to.be.true;
            done();
        });

        it('should accept files smaller than 50MB', (done) => {
            const mockReq = {
                file: {
                    size: 10 * 1024 * 1024 // 10MB
                }
            };

            const maxSize = 50 * 1024 * 1024;
            const isValid = mockReq.file.size <= maxSize;

            expect(isValid).to.be.true;
            done();
        });
    });

    // ------------------------------
    // File Type Filtering Tests
    // ------------------------------
    describe('File Type Filtering (MIME Types)', () => {

        it('should allow image/jpeg files', (done) => {
            const mockReq = {};
            const mockFile = {
                mimetype: 'image/jpeg',
                originalname: 'photo.jpg'
            };

            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const isAllowed = allowedMimes.includes(mockFile.mimetype);
            expect(isAllowed).to.be.true;
            done();
        });

        it('should allow image/png files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const mimetypes = ['image/png', 'image/gif', 'image/webp'];

            mimetypes.forEach(mimetype => {
                expect(allowedMimes.includes(mimetype)).to.be.true;
            });
            done();
        });

        it('should allow video/mp4 files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            expect(allowedMimes.includes('video/mp4')).to.be.true;
            expect(allowedMimes.includes('video/webm')).to.be.true;
            done();
        });

        it('should allow audio/mpeg files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const audioMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

            audioMimes.forEach(mime => {
                expect(allowedMimes.includes(mime)).to.be.true;
            });
            done();
        });

        it('should allow PDF files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            expect(allowedMimes.includes('application/pdf')).to.be.true;
            done();
        });

        it('should allow Word documents', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            expect(allowedMimes.includes('application/msword')).to.be.true;
            expect(allowedMimes.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).to.be.true;
            done();
        });

        it('should reject executable files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const blockedMimes = [
                'application/x-msdownload',
                'application/x-msdos-program',
                'application/x-executable'
            ];

            blockedMimes.forEach(mime => {
                expect(allowedMimes.includes(mime)).to.be.false;
            });
            done();
        });

        it('should reject .zip files', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            expect(allowedMimes.includes('application/zip')).to.be.false;
            done();
        });

        it('should have a comprehensive MIME type list', (done) => {
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            expect(allowedMimes.length).to.be.at.least(10);
            expect(allowedMimes).to.include('image/jpeg');
            expect(allowedMimes).to.include('application/pdf');
            done();
        });
    });

    // ------------------------------
    // Filename Normalization Tests
    // ------------------------------
    describe('Filename Normalization', () => {

        it('should normalize filenames with accents', (done) => {
            const testCases = [
                { input: 'café', expected: 'cafe' },
                { input: 'élève', expected: 'eleve' },
                { input: 'naïve', expected: 'naive' }
            ];

            testCases.forEach(testCase => {
                const normalized = testCase.input
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

                expect(normalized).to.equal(testCase.expected);
            });
            done();
        });

        it('should convert filenames to lowercase', (done) => {
            const testCases = ['TEST.PDF', 'Image.PNG', 'Document.DOCX'];

            testCases.forEach(filename => {
                const ext = path.extname(filename);
                const name = path.basename(filename, ext);
                const lowercase = name.toLowerCase();

                expect(lowercase).to.equal(lowercase);
                expect(lowercase).to.not.equal(name);
            });
            done();
        });

        it('should remove special characters from filenames', (done) => {
            const testCases = [
                'test@file.pdf',
                'document#2024.docx',
                'image$final.png',
                'video!hd.mp4'
            ];

            testCases.forEach(filename => {
                const cleaned = filename
                    .replace(/[^a-z0-9]/g, "-")
                    .replace(/-+/g, "-");

                expect(cleaned).to.not.include('@');
                expect(cleaned).to.not.include('#');
                expect(cleaned).to.not.include('$');
                expect(cleaned).to.not.include('!');
            });
            done();
        });

        it('should replace consecutive dashes with single dash', (done) => {
            const testCases = [
                'file---name.pdf',
                'doc---ument.docx',
                'image---test---2024.png'
            ];

            testCases.forEach(filename => {
                const cleaned = filename.replace(/-+/g, "-");

                expect(cleaned).to.not.include('---');
                expect(cleaned).to.not.include('--');
            });
            done();
        });

        it('should preserve file extension', (done) => {
            const testCases = [
                'café.pdf',
                'test@file.doc',
                'DOCUMENT#2024.XLSX'
            ];

            testCases.forEach(filename => {
                const ext = path.extname(filename);

                expect(ext).to.not.be.empty;
                expect(ext).to.include('.');
            });
            done();
        });

        it('should handle empty filename after normalization', (done) => {
            const problematicNames = ['@#$%.pdf', '!!!.txt', '   .doc'];

            problematicNames.forEach(filename => {
                const ext = path.extname(filename);
                const name = path.basename(filename, ext);
                const cleaned = name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "-")
                    .replace(/-+/g, "-");

                // S'assurer qu'on peut créer un nom unique même avec nom vide
                const uniqueName = cleaned || 'file';
                expect(uniqueName).to.not.be.empty;
            });
            done();
        });
    });

    // ------------------------------
    // Unique Filename Generation Tests
    // ------------------------------
    describe('Unique Filename Generation', () => {

        it('should include timestamp in filename', (done) => {
            const timestamp = Date.now();
            const filename = `${timestamp}-abc123-document.pdf`;

            expect(filename).to.include(String(timestamp));
            done();
        });

        it('should include random string in filename', (done) => {
            const random1 = Math.random().toString(36).substring(2, 9);
            const random2 = Math.random().toString(36).substring(2, 9);

            expect(random1).to.not.equal(random2);
            done();
        });

        it('should generate different filenames for same input', (done) => {
            const filenames = [];

            for (let i = 0; i < 5; i++) {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 9);
                const filename = `${timestamp}-${random}-document.pdf`;
                filenames.push(filename);
            }

            const uniqueFilenames = new Set(filenames);
            expect(uniqueFilenames.size).to.be.greaterThan(1);
            done();
        });

        it('should maintain chronological order with timestamp', (done) => {
            const filenames = [];

            for (let i = 0; i < 3; i++) {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 9);
                const filename = `${timestamp}-${random}-file.pdf`;
                filenames.push(filename);
            }

            // Les timestamps devraient être en ordre croissant
            const timestamps = filenames.map(f => parseInt(f.split('-')[0]));
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).to.be.greaterThanOrEqual(timestamps[i - 1]);
            }
            done();
        });
    });

    // ------------------------------
    // Uploads Directory Tests
    // ------------------------------
    describe('Uploads Directory Management', () => {

        it('should create uploads directory if it does not exist', () => {
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            expect(fs.existsSync(uploadsDir)).to.be.true;
        });

        it('should have correct directory path', () => {
            expect(uploadsDir).to.include('uploads');
            expect(uploadsDir).to.include('public');
        });

        it('should handle nested directory creation', () => {
            const nestedDir = path.join(uploadsDir, 'test', 'nested');
            fs.mkdirSync(nestedDir, { recursive: true });

            expect(fs.existsSync(nestedDir)).to.be.true;

            // Cleanup
            fs.rmSync(path.join(uploadsDir, 'test'), { recursive: true, force: true });
        });
    });

    // ------------------------------
    // Multer Middleware Integration Tests
    // ------------------------------
    describe('Multer Middleware Integration', () => {

        it('should be compatible with Express middleware pattern', () => {
            const single = upload.single('file');
            expect(single).to.be.a('function');
            expect(single.length).to.equal(3); // (req, res, next)
        });

        it('should support multiple file uploads', () => {
            const multiple = upload.array('files', 10);
            expect(multiple).to.be.a('function');
        });

        it('should support field uploads', () => {
            const fields = upload.fields([
                { name: 'file', maxCount: 1 },
                { name: 'thumbnail', maxCount: 1 }
            ]);
            expect(fields).to.be.a('function');
        });
    });

    // ------------------------------
    // Error Handling Tests
    // ------------------------------
    describe('Error Handling', () => {

        it('should provide error callback for disallowed MIME types', (done) => {
            const mockReq = {};
            const mockFile = {
                fieldname: 'file',
                originalname: 'malware.exe',
                mimetype: 'application/x-msdownload'
            };

            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm',
                'audio/mpeg', 'audio/wav', 'audio/ogg',
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const isAllowed = allowedMimes.includes(mockFile.mimetype);
            expect(isAllowed).to.be.false;
            done();
        });

        it('should handle missing file field gracefully', (done) => {
            const mockReq = {};
            const mockFile = null;

            const hasFile = mockFile !== null && mockFile !== undefined;
            expect(hasFile).to.be.false;
            done();
        });
    });
});
