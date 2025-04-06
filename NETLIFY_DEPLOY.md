# Netlify Deployment Guide for TaskFlowSync

## Common Issues

### 1. Port Conflict Issue (EADDRINUSE)

When you see this error:
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5001
```

It means you already have a server process running on port 5001. 

**Solution:**
```bash
# Run our helper script to kill the process
npm run kill-server

# Or start fresh with
npm run dev:fresh
```

### 2. Netlify Build Issues

The Netlify build is configured with:
- Build command: `npm run netlify:build`
- Publish directory: `dist`

**Key files for deployment:**
1. `vite.config.ts` - Sets output directory to `/dist`
2. `netlify.toml` - Configures build settings and redirects
3. `functions/index.js` - Handles API requests

## How the Fixes Work

1. **Build Output:**
   - Vite now builds directly to `/dist` (not client/dist)
   - This aligns with Netlify's expected structure

2. **API Functions:**
   - All API endpoints are handled by `functions/index.js`
   - The function routes requests based on the path

3. **Redirects:**
   - `/api/*` redirects to `/.netlify/functions/index`
   - All other routes redirect to `index.html` for the SPA

## Local Testing

Before deploying, test locally:

1. Kill any existing server processes:
   ```
   npm run kill-server
   ```

2. Start the development server:
   ```
   npm run dev:fresh
   ```

3. Test a production build:
   ```
   npm run build
   npx serve dist
   ```

## Deployment Steps

1. Commit and push all changes to GitHub
2. Connect your repository to Netlify
3. Use the build settings specified in `netlify.toml`
4. Deploy!

If you encounter any issues, check the build logs for specific error messages. 