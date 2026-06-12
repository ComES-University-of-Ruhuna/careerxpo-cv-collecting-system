/**
 * One-time script to generate a Google OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/
 *   2. Enable the "Google Drive API"
 *   3. Go to Credentials → Create Credentials → OAuth client ID
 *   4. Application type: "Desktop app"
 *   5. Download the JSON and copy client_id + client_secret into .env.local
 *
 * Usage:
 *   node scripts/get-drive-token.js
 *
 * Then open the URL in your browser, authorize, paste the code back here.
 * Copy the refresh_token into your .env.local as GOOGLE_REFRESH_TOKEN.
 */

const http = require('http');
const { URL } = require('url');

require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local first.');
  console.error('\nSteps:');
  console.error('  1. Go to https://console.cloud.google.com/apis/credentials');
  console.error('  2. Create OAuth client ID (Desktop app)');
  console.error('  3. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.local');
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPES)}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Authorize with your Google account.');
console.log('3. You will be redirected. The token will be captured automatically.\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3001`);
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('No authorization code received');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      res.writeHead(400);
      res.end(`Error: ${tokenData.error_description || tokenData.error}`);
      console.error('Token error:', tokenData);
      server.close();
      return;
    }

    const refreshToken = tokenData.refresh_token;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Success!</h1>
      <p>Refresh token obtained. You can close this window.</p>
      <p>Check your terminal for the token.</p>
    `);

    console.log('\n========================================');
    console.log('SUCCESS! Add this to your .env.local:');
    console.log('========================================\n');
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`);
    console.log('\n========================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end('Failed to exchange code for token');
    console.error('Exchange error:', err);
    server.close();
  }
});

server.listen(3001, () => {
  console.log('Waiting for OAuth callback on http://localhost:3001/callback ...\n');
});
