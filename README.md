# CareerXpo

Career Fair CV Collection and Bidding System for the Faculty of Engineering, University of Ruhuna.

Students sign in with their university Google account, upload CVs to Google Drive, and strategically spend credits to bid on job positions from companies participating in the career fair.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB 7 (Mongoose ODM)
- **Storage**: Google Drive API (OAuth2 Desktop client)
- **Auth**: Google OAuth2 (student login) + JWT (httpOnly cookies + Bearer tokens) + bcrypt (admin passwords)
- **Email**: Nodemailer (SMTP)
- **Export**: SheetJS (XLSX)
- **Testing**: Jest
- **Containerization**: Docker + Docker Compose

## Features

### Student Portal
- Google OAuth sign-in with university Gmail
- Profile completion with registration number (format: `EG/20XX/XXXX`) and department
- Upload CV in PDF format (stored on Google Drive in organized folders)
- Browse companies and job openings filtered by department
- Bid on positions using allocated credits (default: 100)
- First-come-first-serve max applicant limits per position
- View remaining credit balance and bid history
- Email confirmation on successful bid submission

### Admin Dashboard
- Company management (CRUD) with logo URL and website
- Job vacancy management with markdown descriptions, credit costs, deadlines, and close/reopen toggle
- Max applicants limit per position
- Export applicants to XLSX per job
- Student management — search, view details, reset bids, delete accounts
- Bulk credit top-up for all students
- Activity logs with filtering and pagination
- Analytics dashboard: total students, CVs uploaded, bids per job

### Security
- Rate limiting on login (10 req/15min) and registration (5 req/15min)
- MongoDB ObjectId validation on all endpoints
- NoSQL injection prevention (regex-escaped search queries)
- Input length limits and URL validation
- PDF magic bytes validation on CV upload
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- JWT validation with Bearer token format checking

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended) **OR** Node.js 18+ with MongoDB

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/kavishkakalhara/CareerXpo.git
cd CareerXpo

# Create environment file
cp .env.example .env.local
# Edit .env.local with your values (see Configuration below)

# Start the application
docker compose up --build -d

# Seed admin account (first time only)
docker compose run --rm seed
```

Open [http://localhost:3000](http://localhost:3000).

### Local Development (without Docker)

```bash
npm install
npm run seed    # Seed admin account
npm run dev     # Start dev server
```

### Run Tests

```bash
npm test
npm run test:watch  # Watch mode
```

### Configuration

Create a `.env.local` file with the following variables:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth Web App client ID (student login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Web App client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (e.g. `http://localhost:3000/api/auth/google/callback`) |
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth Desktop client ID (Drive uploads) |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google OAuth Desktop client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth refresh token for Drive API |
| `GOOGLE_DRIVE_FOLDER_ID` | Target folder ID in Google Drive |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_SECURE` | Use TLS (`true`/`false`) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | From address for emails |

> **Note**: SMTP variables are optional. If `SMTP_HOST` is not set, email notifications are silently skipped.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Google Drive API**
3. Create **two OAuth2 credentials**:
   - **Web Application** — for student Google sign-in (set authorized redirect URI)
   - **Desktop Application** — for server-side Drive uploads (generate a refresh token)
4. Share the target Google Drive folder with the OAuth user (Editor access)

### Docker Hub

Production image available at:

```bash
docker pull kavishkakalhara/careerxpo:latest
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Google OAuth, login, register, logout, me, exchange
│   │   ├── admin/          # companies, jobs, jobs/[id]/export, stats, students, credits, logs
│   │   └── student/        # profile, bids, upload, companies
│   ├── admin/              # Admin dashboard pages (dashboard, companies, jobs, students, logs)
│   ├── student/            # Student pages (dashboard, companies, profile)
│   ├── login/              # Student + admin login pages
│   └── register/           # Registration page
├── components/
│   ├── AuthProvider.js     # Auth context with Google OAuth code exchange
│   ├── Navbar.js           # Navigation bar
│   ├── Sidebar.js          # Admin sidebar
│   └── Footer.js           # Footer
├── lib/
│   ├── auth.js             # JWT sign/verify, middleware (authenticate, requireAdmin)
│   ├── auth-codes.js       # Short-lived OAuth auth code store
│   ├── db.js               # MongoDB connection (cached)
│   ├── email.js            # Nodemailer bid confirmation emails
│   ├── google-drive.js     # Google Drive folder creation & CV upload
│   ├── rate-limit.js       # In-memory rate limiter
│   ├── validation.js       # Registration number validation & normalization
│   └── activity-log.js     # Admin activity logging helper
├── models/
│   ├── User.js             # Student/admin accounts
│   ├── Company.js          # Companies
│   ├── Job.js              # Job vacancies
│   ├── Bid.js              # Student bids (unique index on user+job)
│   └── ActivityLog.js      # Admin activity audit log
└── scripts/
    └── seed-admin.js       # Admin account seeder
tests/
├── lib/
│   ├── auth.test.js        # Auth utilities (16 tests)
│   ├── validation.test.js  # Registration number validation (6 tests)
│   ├── rate-limit.test.js  # Rate limiter (9 tests)
│   ├── auth-codes.test.js  # Auth code store (5 tests)
│   └── email.test.js       # Email sending (4 tests)
└── api/
    └── student-bids.test.js  # Bid API route (10 tests)
```

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/google` | Public | Redirect to Google OAuth consent |
| GET | `/api/auth/google/callback` | Public | OAuth callback handler |
| POST | `/api/auth/exchange` | Public | Exchange auth code for JWT |
| POST | `/api/auth/login` | Public | Admin password login |
| POST | `/api/auth/register` | Public | Admin registration |
| GET | `/api/auth/me` | User | Get current user |
| POST | `/api/auth/logout` | Public | Clear auth cookie |
| GET/POST | `/api/admin/companies` | Admin | List/create companies |
| GET/PUT/DELETE | `/api/admin/companies/[id]` | Admin | Company CRUD |
| GET/POST | `/api/admin/jobs` | Admin | List/create job vacancies |
| GET/PUT/DELETE | `/api/admin/jobs/[id]` | Admin | Job CRUD (close/reopen, deadline) |
| GET | `/api/admin/jobs/[id]/export` | Admin | Export applicants as XLSX |
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/students` | Admin | Search students |
| GET/PUT/DELETE | `/api/admin/students/[id]` | Admin | Student details/reset bids/delete |
| POST | `/api/admin/credits` | Admin | Bulk credit top-up |
| GET | `/api/admin/logs` | Admin | Activity logs (paginated, filterable) |
| GET/PUT | `/api/student/profile` | Student | Get/update profile |
| GET/POST | `/api/student/bids` | Student | List/place bids |
| POST | `/api/student/upload` | Student | Upload CV (PDF) |
| GET | `/api/student/companies` | Student | Browse companies & jobs |

## License

MIT
