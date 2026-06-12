# CareerXpo

Career Fair CV Collection and Bidding System for the Faculty of Engineering, University of Ruhuna.

Students register with their university registration number, upload CVs to Google Drive, and strategically spend credits to bid on companies participating in the career fair.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB (Mongoose ODM)
- **Storage**: Google Drive API (Service Account)
- **Auth**: JWT (httpOnly cookies + Bearer tokens), bcrypt password hashing

## Features

### Student Portal
- Register with engineering registration number (`eg` + 5 digits, e.g. `eg20001`)
- Upload CV in PDF format (stored on Google Drive as `[reg_no]_CV.pdf`)
- Browse companies and their job openings
- Bid on companies using allocated credits (default: 100)
- View remaining credit balance and bid history

### Admin Dashboard
- Company management (CRUD) with configurable credit costs
- Job vacancy management (CRUD) with markdown descriptions
- Analytics: total students, CVs uploaded, bids per company
- Pre-seeded admin account

### Bidding Engine
- Atomic credit deduction using MongoDB transactions (prevents race conditions)
- Balance validation before bid placement
- Duplicate bid prevention (one bid per student per company)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud service account with Drive API enabled

### Installation

```bash
npm install
```

### Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `DEFAULT_CREDITS` | Credits allocated to new students (default: 100) |
| `GOOGLE_DRIVE_FOLDER_ID` | Target folder ID in Google Drive |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |

### Google Drive Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Drive API**
3. Create a **Service Account** and download the JSON key
4. Copy the `client_email` and `private_key` into `.env.local`
5. Create a folder in Google Drive and share it with the service account email (Editor access)
6. Copy the folder ID from the URL into `GOOGLE_DRIVE_FOLDER_ID`

### Seed Admin Account

```bash
npm run seed
```

Default credentials: `admin` / `Admin@123`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout, me
│   │   ├── admin/         # companies, jobs, stats
│   │   └── student/       # profile, bids, upload, companies
│   ├── admin/             # Admin dashboard pages
│   ├── student/           # Student dashboard pages
│   ├── login/             # Login page
│   └── register/          # Registration page
├── components/            # AuthProvider, Navbar, Sidebar
├── lib/
│   ├── auth.js            # JWT utilities & middleware
│   ├── db.js              # MongoDB connection
│   ├── google-drive.js    # Google Drive upload helper
│   └── validation.js      # Registration number regex
├── models/                # Mongoose schemas
│   ├── User.js
│   ├── Company.js
│   ├── Job.js
│   └── Bid.js
└── scripts/
    └── seed-admin.js      # Admin account seeder
```

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Student registration |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Public | Logout |
| GET | `/api/auth/me` | User | Get current user |
| GET/POST | `/api/admin/companies` | Admin | List/create companies |
| GET/PUT/DELETE | `/api/admin/companies/[id]` | Admin | Company CRUD |
| GET/POST | `/api/admin/jobs` | Admin | List/create jobs |
| GET/PUT/DELETE | `/api/admin/jobs/[id]` | Admin | Job CRUD |
| GET | `/api/admin/stats` | Admin | Dashboard analytics |
| GET | `/api/student/profile` | Student | Get profile |
| GET/POST | `/api/student/bids` | Student | List/place bids |
| POST | `/api/student/upload` | Student | Upload CV to Google Drive |
| GET | `/api/student/companies` | Student | Browse companies with jobs |

## License

MIT
