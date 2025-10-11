# Repository Separation Guide

This guide explains how to split the monorepo into separate frontend and backend repositories.

## Overview

The Axioris project has been decoupled into two independent applications:

- **Frontend (this repo)**: React + Vite SPA that runs in the browser
- **Backend (separate repo)**: Express + Prisma API server with WebSocket support

The frontend communicates with the backend via REST API and WebSocket connections.

## What Was Changed

### Frontend Changes (This Repository)

1. **Removed server dependencies**: All Express, Prisma, and Node.js-specific packages have been removed
2. **Moved shared code**: `shared/profileGradients.ts` → `src/utils/profileGradients.ts`
3. **Updated imports**: All components now import from `src/utils/` instead of `@shared/`
4. **Configurable API URL**: Backend URL is now set via `VITE_API_URL` environment variable
5. **Updated scripts**: Removed server-related commands (`yarn server`, concurrently, nodemon)
6. **Updated documentation**: README reflects frontend-only architecture

### Backend Changes (To Be Done in Separate Repo)

The following files/folders should be moved to a new backend repository:

```
server/               # All backend code
prisma/               # Database schema and migrations
sessions/             # Session store (file-based)
shared/               # Shared utilities (if still needed)
```

## Setting Up the Backend Repository

### 1. Create New Backend Repository

```bash
# Create new repository
mkdir axioris-backend
cd axioris-backend
git init

# Copy backend files from original repo
# (Assuming you're in the original repo directory)
cp -r server/ ../axioris-backend/
cp -r prisma/ ../axioris-backend/
cp -r sessions/ ../axioris-backend/
cp -r shared/ ../axioris-backend/
cp -r translations/ ../axioris-backend/  # If backend needs translations
```

### 2. Create Backend package.json

Create a new `package.json` in the backend repo with server dependencies:

```json
{
  "name": "axioris-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.ts",
    "dev": "nodemon server/index.ts",
    "build": "tsc",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "@ffprobe-installer/ffprobe": "^2.1.2",
    "@prisma/client": "^6.16.3",
    "bcrypt": "^6.0.0",
    "bcryptjs": "^3.0.2",
    "compression": "^1.8.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "express-rate-limit": "^8.1.0",
    "express-session": "^1.18.1",
    "fs-extra": "^11.3.2",
    "helmet": "^8.1.0",
    "i18next": "^25.5.3",
    "i18next-fs-backend": "^2.6.0",
    "i18next-http-middleware": "^3.3.2",
    "leo-profanity": "^1.8.0",
    "lusca": "^1.7.0",
    "multer": "^2.0.2",
    "session-file-store": "^1.5.0",
    "speakeasy": "^2.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/compression": "^1.8.1",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.3",
    "@types/express-session": "^1.18.0",
    "@types/fs-extra": "^11.0.4",
    "@types/helmet": "^0.0.48",
    "@types/leo-profanity": "^1.5.4",
    "@types/lusca": "^1.7.5",
    "@types/multer": "^2.0.0",
    "@types/node": "^24.5.2",
    "@types/session-file-store": "^1.2.5",
    "@types/speakeasy": "^2.0.10",
    "@types/ws": "^8.5.12",
    "nodemon": "^3.1.7",
    "prisma": "^6.16.3",
    "supertest": "^7.1.4",
    "tsx": "^4.19.2",
    "typescript": "~5.9.2"
  }
}
```

### 3. Create Backend .env File

Create `.env` in the backend repo:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="file:./prisma/dev.db"

# Session
SESSION_SECRET=your-secret-key-change-this-in-production

# Upload Configuration
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=.jpg,.jpeg,.png,.gif,.mp4,.webm,.mov

# Email Configuration (if used)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### 4. Update Backend CORS Configuration

In `server/index.ts`, configure CORS to allow frontend origin:

```typescript
import cors from 'cors';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5. Install Backend Dependencies

```bash
cd axioris-backend
yarn install
```

### 6. Run Database Migrations

```bash
yarn prisma:generate
yarn prisma:migrate
```

### 7. Start Backend Server

```bash
# Development
yarn dev

# Production
yarn start
```

## Setting Up the Frontend

### 1. Configure API URL

Create `.env` in the frontend repo:

```bash
# Backend API URL
VITE_API_URL=http://localhost:3001

# HMR Configuration (optional)
VITE_HMR_HOST=localhost
VITE_HMR_PORT=5173
```

### 2. Install Frontend Dependencies

```bash
yarn install
```

### 3. Start Frontend Dev Server

```bash
yarn dev
```

The frontend will now connect to the backend API at `http://localhost:3001`.

## Production Deployment

### Backend Deployment

1. **Environment Variables**: Set production values in `.env`:
   ```bash
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://axioris.social
   DATABASE_URL=<production-database-url>
   SESSION_SECRET=<secure-random-string>
   ```

2. **Build and Run**:
   ```bash
   yarn install --production
   yarn build
   yarn start
   ```

3. **Use Process Manager** (recommended):
   ```bash
   pm2 start server/index.ts --name axioris-backend
   ```

### Frontend Deployment

1. **Environment Variables**: Set production API URL in `.env`:
   ```bash
   VITE_API_URL=https://api.axioris.social
   ```

2. **Build**:
   ```bash
   yarn build
   ```

3. **Deploy**: Upload `dist/` folder to your hosting provider (Netlify, Vercel, etc.)

### Nginx Configuration (Example)

```nginx
# Frontend
server {
    listen 80;
    server_name axioris.social;
    root /var/www/axioris-frontend/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.axioris.social;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Testing the Separation

### 1. Start Backend

```bash
cd axioris-backend
yarn dev
```

Backend should be running at `http://localhost:3001`

### 2. Start Frontend

```bash
cd axioris-frontend
yarn dev
```

Frontend should be running at `http://localhost:5173`

### 3. Test API Communication

1. Open browser to `http://localhost:5173`
2. Check browser console - should see API requests to `http://localhost:3001`
3. Test login, posts, profiles to ensure API communication works
4. Check WebSocket connection for real-time features

## Troubleshooting

### CORS Errors

**Problem**: Browser blocks API requests with CORS error

**Solution**: Ensure backend CORS is configured correctly:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Connection Refused

**Problem**: Frontend can't connect to backend

**Solution**: 
1. Check backend is running: `curl http://localhost:3001/api/health`
2. Verify `VITE_API_URL` in frontend `.env`
3. Check firewall/network settings

### Session Issues

**Problem**: Login doesn't persist, session lost

**Solution**:
1. Ensure `credentials: true` in both CORS (backend) and fetch calls (frontend)
2. Check `SESSION_SECRET` is set in backend `.env`
3. Verify session store is writable (`sessions/` folder)

### WebSocket Issues

**Problem**: Real-time features not working

**Solution**:
1. Check WebSocket upgrade headers in Nginx/proxy
2. Verify `FRONTEND_URL` in backend matches actual frontend URL
3. Test WebSocket connection: `wscat -c ws://localhost:3001`

## Migration Checklist

- [ ] Backend repository created
- [ ] Backend `package.json` created with server dependencies
- [ ] Backend `.env` configured
- [ ] CORS configured in backend
- [ ] Database migrations run
- [ ] Backend server starts successfully
- [ ] Frontend `.env` configured with `VITE_API_URL`
- [ ] Frontend dependencies installed
- [ ] Frontend dev server starts
- [ ] API communication works (check browser console)
- [ ] Login/authentication works
- [ ] WebSocket connection established
- [ ] Production deployment configured
- [ ] Documentation updated

## Additional Resources

- [Express CORS Documentation](https://expressjs.com/en/resources/middleware/cors.html)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

## Support

If you encounter issues during the separation:

1. Check browser console for errors
2. Check backend logs for API errors
3. Verify environment variables are set correctly
4. Test API endpoints directly with curl/Postman
5. Review CORS configuration

For questions or issues, please open a GitHub issue in the respective repository.
