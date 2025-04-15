# Netlify Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Missing `dist` Directory

**Problem:** The build fails because Netlify can't find the `dist` directory.

**Solution:**
- We've implemented a robust build process in `netlify.sh` that:
  - Cleans any existing `dist` directory
  - Creates a fresh `dist` directory
  - Runs the build process with explicit output settings
  - Verifies the directory exists with required files

**How to verify locally:**
```bash
npm run build:clean
```
This should create a `dist` directory with all necessary files.

### 2. API Requests Failing

**Problem:** API requests return 404 errors after deployment.

**Solution:**
- We've set up Netlify Functions to handle API requests:
  - All `/api/*` routes are redirected to the serverless function
  - The function handles routing based on the request path
  - CORS headers are properly set

**How to verify:**
Visit `/debug` on your deployed site to check the API status.

### 3. Build Script Configuration

**Problem:** Netlify build scripts don't execute properly.

**Solution:**
- We've simplified the build process:
  - Using a bash script (`netlify.sh`) for more control
  - Explicitly setting output directories
  - Adding verification steps
  - Creating a _redirects file in the dist directory

**How to verify:**
Check your Netlify deploy logs to see the output of each build step.

### 4. Verifying a Successful Deployment

After deploying, navigate to these URLs to verify everything works:

1. **Main app:** Visit your site's main URL
2. **Debug page:** Visit `/debug` to see deployment information
3. **API test:** The debug page will test API connectivity

## Local Testing Before Deployment

Run these commands locally to simulate what Netlify will do:

```bash
# Clean and build
npm run build:clean

# Check the dist directory contents
ls -la dist

# Serve the dist directory locally
npx serve dist
```

## Files to Check If Problems Persist

1. `vite.config.ts` - Check the `outDir` setting
2. `netlify.toml` - Verify publish directory and redirects
3. `package.json` - Check build scripts
4. `netlify.sh` - Review the deployment process

## Netlify Build Settings

Make sure your Netlify site has these settings:
- Build command: `bash netlify.sh`
- Publish directory: `dist`
- Node version: 18 (or your preferred version)

## Additional Help

If problems persist:
1. Check the Netlify deploy logs for specific error messages
2. Visit the `/debug` page on your deployed site
3. Try a manual deployment with the Netlify CLI tool 