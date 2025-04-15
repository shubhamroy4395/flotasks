// postbuild.js
// This script runs after the build to verify the dist directory contents

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'client', 'dist');

console.log('Checking dist directory contents...');

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory does not exist!');
  process.exit(1);
}

// Check if main files exist
const requiredFiles = ['index.html', 'assets'];
let missingFiles = [];

for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error(`❌ Missing required files in dist directory: ${missingFiles.join(', ')}`);
  process.exit(1);
}

// List contents of the dist directory
console.log('dist directory contents:');
const distContents = fs.readdirSync(distDir);
distContents.forEach(item => {
  const itemPath = path.join(distDir, item);
  const stats = fs.statSync(itemPath);
  console.log(`- ${item} (${stats.isDirectory() ? 'directory' : 'file'})`);
});

// Create _redirects file for Netlify if it doesn't exist
const redirectsPath = path.join(distDir, '_redirects');
if (!fs.existsSync(redirectsPath)) {
  console.log('Creating _redirects file for Netlify...');
  const redirects = `
/api/*  /.netlify/functions/index  200
/*      /index.html                200
`;
  fs.writeFileSync(redirectsPath, redirects.trim());
  console.log('✅ Created _redirects file');
}

console.log('✅ dist directory check completed successfully!'); 