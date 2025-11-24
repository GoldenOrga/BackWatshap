import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';

import socketManager from './socket/index.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const server = http.createServer(app);

socketManager.setupSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));