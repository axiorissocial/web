# Vercel Deployment Notes

## API Proxy Configuration

Vercel does not support traditional reverse proxies in the same way as Nginx or Apache. When deploying to Vercel, you have these options for handling API requests:

### Option 1: Direct API Calls (Recommended)
Configure your frontend to call the backend API directly by setting the API URL during build:

```bash
VITE_API_URL=https://api.yourdomain.com vercel build
```

Or set it in Vercel's environment variables:
1. Go to your project settings in Vercel dashboard
2. Add environment variable: `VITE_API_URL=https://api.yourdomain.com`
3. Redeploy

### Option 2: Vercel Rewrites (Advanced)
If your backend is also hosted on Vercel or accessible via HTTP, you can add rewrites to `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-domain.com/api/:path*"
    }
  ]
}
```

**Note:** This requires the backend to handle CORS correctly or be on the same domain.

### Option 3: Vercel Functions (Complex)
Create API routes in the `api/` directory that proxy to your backend. This is more complex and requires additional setup.

## Current Configuration

The current `vercel.json` is configured for:
- SPA routing (all routes serve index.html)
- Proper MIME types for JavaScript, CSS, and other assets
- Security headers

API proxying is intentionally **not** configured in `vercel.json` because:
- Static deployments work best with direct API calls
- Reduces complexity and latency
- Avoids CORS issues
- Backend URL can be configured per environment

## Recommended Setup

1. Deploy your backend separately (e.g., on a VPS, Render, Railway, etc.)
2. Set `VITE_API_URL` to your backend URL in Vercel environment variables
3. Configure CORS on your backend to allow requests from your Vercel domain
4. Deploy the frontend to Vercel

## CORS Configuration

Your backend should allow requests from your Vercel domain:

```javascript
// Express example
app.use(cors({
  origin: ['https://yourdomain.com', 'https://yourdomain.vercel.app'],
  credentials: true
}));
```

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
- [Vercel Documentation](https://vercel.com/docs)
