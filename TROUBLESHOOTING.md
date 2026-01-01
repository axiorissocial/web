# Troubleshooting MIME Type and Module Loading Errors

## Problem: MIME Type Errors in Production

If you're seeing errors like:

```
Loading module from "https://axioris.omgrod.me/node_modules/.vite/deps/react.js?v=5a19e8c8" 
was blocked because of a disallowed MIME type ("")
```

**This means the Vite development server is running in production, which is incorrect.**

## Root Cause

The Vite dev server is designed for development only and should **never** be used in production. The errors occur because:

1. **Development server in production**: URLs like `/node_modules/.vite/deps/` and `/@fs/` are only used by Vite's dev server
2. **Empty MIME types**: The server is not properly configured to serve files with correct Content-Type headers
3. **Missing build step**: The application hasn't been built for production

## Solution

### Step 1: Stop the Dev Server

If you're running `yarn dev` or `yarn start` on your production server, **STOP IT NOW**.

```bash
# Find and kill the vite process
ps aux | grep vite
kill <process-id>

# Or if using pm2
pm2 stop all
pm2 delete all
```

### Step 2: Build the Application

```bash
cd /path/to/axioris/web
yarn install --frozen-lockfile
yarn build
```

This creates a `dist/` directory with optimized static files.

### Step 3: Configure Your Web Server

Choose ONE of the following based on your setup:

#### Option A: Using Nginx (Recommended)

1. Copy the nginx configuration:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/axioris
sudo ln -s /etc/nginx/sites-available/axioris /etc/nginx/sites-enabled/
```

2. Update the configuration:
```bash
sudo nano /etc/nginx/sites-available/axioris
```

Update these lines:
- `server_name` → your domain
- `root` → path to your `dist` directory (e.g., `/home/pi/axioris/dist`)
- Backend proxy URLs if needed

3. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: Using Apache

1. Copy the configuration:
```bash
sudo cp apache.conf /etc/apache2/sites-available/axioris.conf
```

2. Update paths and domain in the config file

3. Enable the site:
```bash
sudo a2ensite axioris
sudo a2enmod rewrite headers proxy proxy_http deflate expires
sudo systemctl reload apache2
```

#### Option C: Using Docker

```bash
# Build the app
yarn build

# Run with docker-compose
docker-compose up -d
```

#### Option D: Static Hosting (Netlify/Vercel/Cloudflare Pages)

These platforms handle everything automatically:
1. Connect your GitHub repository
2. Set build command: `yarn build`
3. Set output directory: `dist`
4. Deploy!

### Step 4: Verify the Fix

1. **Check the served files:**
```bash
curl -I https://axioris.omgrod.me/assets/index-[hash].js
```

Should return:
```
HTTP/1.1 200 OK
Content-Type: application/javascript; charset=utf-8
```

2. **Check browser console** - No MIME type errors should appear

3. **Test routing** - Refresh any page, should not get 404

4. **Verify no dev server URLs** - No URLs should contain:
   - `/node_modules/`
   - `/.vite/`
   - `/@fs/`

## Common Mistakes

### ❌ Running dev server in production
```bash
# WRONG - Don't do this in production
yarn dev
yarn start
npm run dev
```

### ✅ Correct production setup
```bash
# RIGHT - Build and serve static files
yarn build
# Then configure nginx/apache to serve the dist/ directory
```

### ❌ Pointing nginx to source directory
```nginx
# WRONG
root /home/pi/axioris;
```

### ✅ Point to dist directory
```nginx
# RIGHT
root /home/pi/axioris/dist;
```

### ❌ Missing MIME types configuration
If nginx/apache doesn't have proper MIME types configured, JavaScript files will fail to load.

### ✅ Use provided configuration files
The `nginx.conf` and `apache.conf` files in this repository already include proper MIME type configuration.

## Still Having Issues?

### Issue: API calls failing

**Solution:** Configure API proxy in your web server or update `VITE_API_URL` during build:

```bash
VITE_API_URL=https://api.yourdomain.com yarn build
```

### Issue: 404 on page refresh

**Solution:** Configure SPA fallback routing. All routes should serve `index.html`.

For nginx:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

For Apache:
```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]
```

### Issue: CORS errors

**Solution:** 
1. Configure backend CORS headers, OR
2. Use same-domain proxy (already configured in nginx.conf/apache.conf)

### Issue: Empty white page

**Solution:**
1. Check browser console for errors
2. Verify `VITE_API_URL` was set correctly during build
3. Check network tab for failed API calls
4. Ensure backend is accessible

### Issue: AdSense CORS error

This error is expected and unrelated to the main issue:
```
Cross-Origin Request Blocked: ... pagead2.googlesyndication.com/pagead/js/adsbygoogle.js
```

This happens when ad blockers or privacy settings block Google AdSense. It won't affect your site's functionality.

## Quick Checklist

- [ ] Stopped all `yarn dev` / `yarn start` processes
- [ ] Ran `yarn build` successfully
- [ ] `dist/` directory exists and contains `index.html` and `assets/` folder
- [ ] Web server (nginx/apache) is configured to serve from `dist/` directory
- [ ] Web server MIME types are configured for `.js`, `.css`, `.json` files
- [ ] SPA routing is configured (try_files or RewriteRule)
- [ ] API proxy is configured if using separate backend
- [ ] Browser console shows no MIME type errors
- [ ] No URLs contain `/node_modules/` or `/@fs/`

## Getting Help

If you've followed all steps and still have issues:

1. Check web server error logs:
   - Nginx: `/var/log/nginx/error.log`
   - Apache: `/var/log/apache2/error.log`

2. Check nginx/apache configuration:
   ```bash
   # Nginx
   sudo nginx -t
   
   # Apache
   sudo apache2ctl -t
   ```

3. Verify the dist directory content:
   ```bash
   ls -lh dist/
   ls -lh dist/assets/
   ```

4. Test with a simple Python server to rule out build issues:
   ```bash
   cd dist
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

## Prevention

To avoid this issue in the future:

1. **Never run dev server in production** - Use `yarn build` and serve static files
2. **Use process managers** - Use systemd, pm2, or docker to ensure only the correct process runs
3. **Automate deployment** - Set up CI/CD to automatically build and deploy
4. **Test locally** - Run `yarn build && yarn preview` to test production build before deploying
5. **Document your setup** - Keep notes on your production configuration

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [Vite Production Build Guide](https://vitejs.dev/guide/build.html)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Apache Configuration Guide](https://httpd.apache.org/docs/)
