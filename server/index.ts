import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import FileStore from 'session-file-store';
import path from 'path';
import http from 'http';
import { PrismaClient } from '../src/generated/prisma/index.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import accountRoutes from './routes/account.js';
import profileRoutes from './routes/profiles.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import dotenv from 'dotenv';
import { initRealtime } from './realtime.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

const FileStoreSession = FileStore(session);

const sessionMiddleware = session({
  store: new FileStoreSession({
    path: path.join(process.cwd(), 'sessions'),
    ttl: 24 * 60 * 60,
    reapInterval: 60 * 60
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(sessionMiddleware);

app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.use('/api', authRoutes);
app.use('/api', postRoutes);
app.use('/api', accountRoutes);
app.use('/api/users', profileRoutes);
app.use('/api', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', reportRoutes);
app.use('/api', adminRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const server = http.createServer(app);

initRealtime(server, sessionMiddleware as any);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { prisma };