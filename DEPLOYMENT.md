# Deployment Guide

This guide covers how to deploy the Axioris web frontend to production.

## Important: Do NOT Run Dev Server in Production

**The errors you're seeing (MIME type issues, blocked modules) occur when the Vite dev server is running in production.** The dev server is only for development. For production, you must build the application and serve the static files.

## Common Error Symptoms

If you see errors like:
- `Loading module from "https://yoursite.com/node_modules/.vite/deps/react.js" was blocked because of a disallowed MIME type`
- `Loading failed for the module with source "https://yoursite.com/@fs/home/..."`

**This means the Vite dev server is running in production, which is incorrect.**

## Correct Deployment Process

### 1. Build the Application

```bash
# Install dependencies
yarn install

# Build for production
yarn build
```

This creates optimized static files in the `dist/` directory.

### 2. Serve the Built Files

The `dist/` directory contains all the static files needed for production. You need to:
1. Serve these files with a web server (nginx, Apache, etc.)
2. Configure proper MIME types for JavaScript, CSS, and other files
3. Set up SPA routing (all routes should serve `index.html`)
4. Optionally proxy API requests to your backend

### Deployment Options

## Option 1: Nginx (Recommended for VPS/Dedicated Server)

1. **Copy nginx configuration:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/axioris
   sudo ln -s /etc/nginx/sites-available/axioris /etc/nginx/sites-enabled/
   ```

2. **Update the configuration:**
   - Edit `/etc/nginx/sites-available/axioris`
   - Change `server_name` to your domain
   - Update `root` path to point to your `dist` directory
   - Update backend proxy URLs if needed

3. **Deploy the built files:**
   ```bash
   # Build the app
   yarn build
   
   # Copy to server location
   sudo mkdir -p /var/www/axioris
   sudo cp -r dist/* /var/www/axioris/
   ```

4. **Test and reload nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Option 2: Static Hosting (Netlify, Vercel, Cloudflare Pages)

These platforms automatically handle MIME types and SPA routing.

### Netlify
1. Connect your GitHub repository
2. Set build command: `yarn build`
3. Set publish directory: `dist`
4. The `public/_headers` and `public/_redirects` files will be automatically used

### Vercel
1. Connect your GitHub repository
2. Set build command: `yarn build`
3. Set output directory: `dist`
4. The `vercel.json` file will be automatically used

### Cloudflare Pages
1. Connect your GitHub repository
2. Set build command: `yarn build`
3. Set build output directory: `dist`
4. The `public/_headers` and `public/_redirects` files will be automatically used

## Option 3: Apache

1. **Enable required modules:**
   ```bash
   sudo a2enmod rewrite
   sudo a2enmod headers
   sudo systemctl restart apache2
   ```

2. **Create virtual host configuration:**
   ```apache
   <VirtualHost *:80>
       ServerName axioris.omgrod.me
       DocumentRoot /var/www/axioris/dist

       <Directory /var/www/axioris/dist>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted

           # SPA fallback
           RewriteEngine On
           RewriteBase /
           RewriteRule ^index\.html$ - [L]
           RewriteCond %{REQUEST_FILENAME} !-f
           RewriteCond %{REQUEST_FILENAME} !-d
           RewriteRule . /index.html [L]

           # Set correct MIME types
           AddType application/javascript .js .mjs
           AddType text/css .css
           AddType application/json .json
           AddType image/svg+xml .svg
           
           # Security headers
           Header set X-Content-Type-Options "nosniff"
           Header set X-Frame-Options "SAMEORIGIN"
           Header set X-XSS-Protection "1; mode=block"
       </Directory>

       # Proxy API requests to backend
       ProxyPass /api http://localhost:3001/api
       ProxyPassReverse /api http://localhost:3001/api
       
       ProxyPass /uploads http://localhost:3001/uploads
       ProxyPassReverse /uploads http://localhost:3001/uploads
       
       ProxyPass /sitemap.xml http://localhost:3001/sitemap.xml
       ProxyPassReverse /sitemap.xml http://localhost:3001/sitemap.xml

       ErrorLog ${APACHE_LOG_DIR}/axioris_error.log
       CustomLog ${APACHE_LOG_DIR}/axioris_access.log combined
   </VirtualHost>
   ```

3. **Deploy:**
   ```bash
   yarn build
   sudo mkdir -p /var/www/axioris
   sudo cp -r dist/* /var/www/axioris/
   sudo systemctl reload apache2
   ```

## Environment Variables for Production

Create a `.env.production` file or set environment variables during build:

```bash
VITE_API_URL=https://api.axioris.omgrod.me
```

Or set during build:
```bash
VITE_API_URL=https://api.axioris.omgrod.me yarn build
```

## Troubleshooting

### Still seeing MIME type errors?

1. **Check if you're actually serving the `dist/` directory**, not the source files
2. **Verify MIME types are configured** in your web server
3. **Check web server logs** for errors
4. **Test with curl:**
   ```bash
   curl -I https://axioris.omgrod.me/assets/index-[hash].js
   ```
   Should return: `Content-Type: application/javascript`

### Backend API not working?

1. Ensure your backend is running and accessible
2. Check proxy configuration in nginx/Apache
3. For static hosting, update API URLs in your frontend to point directly to backend

### SPA routing not working (404 on refresh)?

1. Ensure web server is configured to serve `index.html` for all routes
2. Check `_redirects` (Netlify/CF) or `vercel.json` or nginx/Apache config

## Security Notes

1. **Never commit `.env` files** - use `.env.example` as template
2. **Use HTTPS in production** - configure SSL certificates
3. **Keep dependencies updated** - run `yarn upgrade` regularly
4. **Review CSP headers** - consider adding Content-Security-Policy headers
5. **Block source maps** - ensure `.map` files return 404 in production

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
        run: yarn build
      
      - name: Deploy to server
        # Add your deployment step here
        # e.g., rsync, scp, or platform-specific deploy command
```

## Health Check

After deployment, verify:

1. ✅ All JavaScript files load with `Content-Type: application/javascript`
2. ✅ CSS files load with `Content-Type: text/css`
3. ✅ No 404 errors in browser console
4. ✅ SPA routing works (refresh any route)
5. ✅ API calls succeed
6. ✅ No MIME type warnings in console

## Quick Reference

| Problem | Solution |
|---------|----------|
| MIME type errors | Serve `dist/` not source, configure web server MIME types |
| 404 on route refresh | Configure SPA fallback (try_files, _redirects, etc.) |
| API calls fail | Set up proxy or CORS on backend |
| Blank page | Check browser console, verify API URL in build |
| Dev server in prod | Use `yarn build` + static server, not `yarn dev` |
