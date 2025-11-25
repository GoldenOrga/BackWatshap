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
const allowedOrigins = [
  'https://front-whatsapp-production.up.railway.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, origin);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','sentry-trace', 'baggage'],
}));

initSentry(app);

app.options('*', cors());

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
