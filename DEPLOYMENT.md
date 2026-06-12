# CareerXpo — Production Deployment Guide

Career Fair CV Collection & Bidding System  
Faculty of Engineering, University of Ruhuna

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Drive API Setup](#google-drive-api-setup)
3. [Environment Variables](#environment-variables)
4. [Option A: Deploy with Docker Compose (Recommended)](#option-a-deploy-with-docker-compose-recommended)
5. [Option B: Deploy to a VPS Manually](#option-b-deploy-to-a-vps-manually)
6. [Option C: Deploy to Vercel + MongoDB Atlas](#option-c-deploy-to-vercel--mongodb-atlas)
7. [Post-Deployment](#post-deployment)
8. [Reverse Proxy with Nginx](#reverse-proxy-with-nginx)
9. [SSL with Let's Encrypt](#ssl-with-lets-encrypt)
10. [Maintenance & Backups](#maintenance--backups)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| MongoDB | 7+ | Database |
| Docker & Docker Compose | Latest | Containerized deployment |
| Google Cloud Account | — | Drive API for CV storage |
| Domain Name | — | Production URL (optional but recommended) |

---

## Google Drive API Setup

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., `CareerXpo`)
3. Enable the **Google Drive API** from APIs & Services → Library

### 2. Create OAuth2 Credentials
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Desktop app**
4. Note down the **Client ID** and **Client Secret**

### 3. Configure OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Set User Type to **External**
3. Fill in app name: `CareerXpo`
4. Add your Gmail as a **test user**
5. To remove the "unverified app" warning for production, submit for Google verification

### 4. Generate Refresh Token
```bash
# Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first
node scripts/get-drive-token.js
```
Open the printed URL in your browser, authorize, and copy the `GOOGLE_REFRESH_TOKEN` into your environment.

### 5. Create a Drive Folder
1. Go to [Google Drive](https://drive.google.com/)
2. Create a folder (e.g., `CareerXpo CVs`)
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

---

## Environment Variables

Create a `.env.local` (development) or `.env.production` (production) file:

```bash
# Database
MONGODB_URI=mongodb://mongo:27017/careerxpo

# Auth
JWT_SECRET=<generate-a-64-char-random-string>
DEFAULT_CREDITS=100

# Google Drive OAuth2
GOOGLE_DRIVE_FOLDER_ID=<your-drive-folder-id>
GOOGLE_CLIENT_ID=<your-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-oauth-client-secret>
GOOGLE_REFRESH_TOKEN=<your-refresh-token>

# Admin Credentials (used by seed script only)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-admin-password>
```

### Generate a Secure JWT Secret
```bash
openssl rand -base64 48
```

> **Security**: Never commit `.env.local` or `.env.production` to version control.

---

## Option A: Deploy with Docker Compose (Recommended)

Best for VPS deployments (DigitalOcean, AWS EC2, Hetzner, etc.).

### 1. Clone and Configure

```bash
git clone <your-repo-url> CareerXpo
cd CareerXpo
cp .env.example .env.local
# Edit .env.local with production values
```

### 2. Create Production Compose Override

Create `docker-compose.prod.yml`:

```yaml
services:
  app:
    build:
      context: .
      target: production
    volumes: []  # Remove dev volume mounts
    environment:
      - NODE_ENV=production
    restart: always

  mongo:
    ports: []  # Don't expose MongoDB externally
    restart: always
```

### 3. Build and Start

```bash
# Build production image
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Seed admin account (first time only)
docker compose --profile seed run seed

# View logs
docker compose logs -f app
```

### 4. Verify
```bash
curl http://localhost:3000
```

---

## Option B: Deploy to a VPS Manually

### 1. Install Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm mongodb-org nginx certbot python3-certbot-nginx

# Install Node 18+ via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### 2. Clone and Build

```bash
cd /opt
git clone <your-repo-url> careerxpo
cd careerxpo
npm ci
npm run build
```

### 3. Set Environment Variables

```bash
cp .env.example .env.local
nano .env.local
# Fill in all production values
```

### 4. Seed Admin

```bash
npm run seed
```

### 5. Run with PM2

```bash
npm install -g pm2

# Start the app
pm2 start npm --name careerxpo -- start
pm2 save
pm2 startup
```

### 6. Verify

```bash
curl http://localhost:3000
```

---

## Option C: Deploy to Vercel + MongoDB Atlas

Best for zero-infrastructure deployments.

### 1. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster
3. Create a database user
4. Whitelist `0.0.0.0/0` for Vercel's dynamic IPs
5. Copy the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/careerxpo`

### 2. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel
```

### 3. Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

| Key | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `<random-64-char-string>` |
| `DEFAULT_CREDITS` | `100` |
| `GOOGLE_DRIVE_FOLDER_ID` | `<folder-id>` |
| `GOOGLE_CLIENT_ID` | `<client-id>` |
| `GOOGLE_CLIENT_SECRET` | `<client-secret>` |
| `GOOGLE_REFRESH_TOKEN` | `<refresh-token>` |

### 4. Seed Admin

Since Vercel is serverless, seed via a local script pointing to Atlas:

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/careerxpo" npm run seed
```

### 5. Redeploy

```bash
vercel --prod
```

---

## Post-Deployment

### Verify Checklist

- [ ] Landing page loads at your domain
- [ ] Student can register with `eg` + 5-digit number
- [ ] Admin can log in with seeded credentials
- [ ] Admin can create companies and jobs
- [ ] Student can upload a CV (check Google Drive folder)
- [ ] Student can place bids, credits deduct correctly
- [ ] Duplicate bids are blocked

### Change Default Admin Password

Log in as admin and consider changing the password via the database:

```bash
# Docker
docker compose exec mongo mongosh careerxpo

# Update password hash (generate with bcrypt)
db.users.updateOne(
  { registration_no: "admin" },
  { $set: { password_hash: "<new-bcrypt-hash>" } }
)
```

---

## Reverse Proxy with Nginx

Create `/etc/nginx/sites-available/careerxpo`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/careerxpo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com
sudo certbot renew --dry-run  # Test auto-renewal
```

Certbot auto-configures Nginx for HTTPS and sets up a cron job for renewal.

---

## Maintenance & Backups

### Database Backup

```bash
# Docker
docker compose exec mongo mongodump --db careerxpo --out /data/backup/$(date +%F)

# Direct
mongodump --uri="mongodb://localhost:27017/careerxpo" --out=./backup/$(date +%F)
```

### Automated Daily Backup (cron)

```bash
crontab -e
# Add:
0 2 * * * docker compose -f /opt/careerxpo/docker-compose.yml exec -T mongo mongodump --db careerxpo --archive=/data/backup/careerxpo-$(date +\%F).archive
```

### Update Application

```bash
# Docker
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Manual
git pull origin main
npm ci
npm run build
pm2 restart careerxpo
```

### Monitor Logs

```bash
# Docker
docker compose logs -f app

# PM2
pm2 logs careerxpo
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `ECONNREFUSED` to MongoDB | Ensure MongoDB is running. In Docker, use `mongodb://mongo:27017` not `localhost` |
| CV upload fails with quota error | Verify OAuth2 refresh token is set and not expired. Re-run `node scripts/get-drive-token.js` |
| `JWT_SECRET` error | Ensure the env variable is set and not empty |
| Admin login fails | Run `npm run seed` or `docker compose --profile seed run seed` |
| Port 3000 already in use | Kill existing process: `lsof -ti:3000 \| xargs kill` |
| Google OAuth "access_denied" | Add your Gmail as a test user in OAuth consent screen |
| Refresh token expired | Google refresh tokens for "Testing" apps expire after 7 days. Submit for verification or re-run the token script |

### Google OAuth Token Expiry Note

If your Google Cloud app is in **"Testing"** status, refresh tokens expire after **7 days**. To fix this permanently:
1. Go to OAuth consent screen → **Publish App**
2. Submit for verification (requires privacy policy URL and domain verification)
3. Once approved, refresh tokens won't expire

As a workaround during development, re-run `node scripts/get-drive-token.js` weekly.
