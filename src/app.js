import * as Sentry from "@sentry/node";
import "./instrument.js";
import express from 'express';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import sessionRoutes from './routes/sessions.js';
import mediaRoutes from './routes/media.js';
import groupRoutes from './routes/groups.js';
import { initSentry } from './config/sentry.js';

const app = express();

// Initialiser Sentry s'il est configuré
initSentry(app);

app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/groups', groupRoutes);

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  res.status(500).send(res.sentry || "Internal error");
});

export default app;
