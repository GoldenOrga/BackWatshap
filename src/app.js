import * as Sentry from "@sentry/node";
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import sessionRoutes from './routes/sessions.js';
import mediaRoutes from './routes/media.js';
import groupRoutes from './routes/groups.js';
import auth from "./middleware/auth.js";
import { initSentry } from "./config/sentry.js";

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || 'https://front-whatsapp-production.up.railway.app';
const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

initSentry(app);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, _res, next) => {
  Sentry.addBreadcrumb({
    category: "request",
    type: "http",
    level: "info",
    message: `${req.method} ${req.originalUrl}`,
    data: {
      query: req.query,
    },
  });

  next();
});

app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/groups', groupRoutes);

app.get("/debug-sentry-auth", auth, function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  res.status(500).send(res.sentry || "Internal error");
});

export default app;
