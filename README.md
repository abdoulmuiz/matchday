# EF MatchDay

A web app for organizing eFootball 1v1 tournaments.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: React + Vite
- **Authentication**: JWT with bcrypt password hashing

## Setup Instructions

### 1. Database Setup

1. Start MySQL (XAMPP: `sudo /opt/lampp/lampp startmysql`, or use the XAMPP Control Panel)
2. Create the database and import the schema (first time only):
   ```bash
   /opt/lampp/bin/mysql -u root -e "CREATE DATABASE IF NOT EXISTS ef_matchday;"
   /opt/lampp/bin/mysql -u root ef_matchday < database/schema.sql
   ```
   Or in phpMyAdmin: create/select `ef_matchday`, then import `database/schema.sql`

3. Copy env files if missing, then adjust credentials:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=ef_matchday
   ```

### 2. Install & run (recommended)

From the project root:

```bash
npm install
npm run install:all
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Or run services separately: `npm run dev:backend` / `npm run dev:frontend`.

## Features Implemented

- ✅ User registration with email verification
- ✅ Live username availability check
- ✅ Password requirements validation (min 8 chars, 1 number)
- ✅ Email verification flow
- ✅ Login with rate limiting (5 attempts per 15 minutes)
- ✅ "Remember me" functionality
- ✅ Forgot password flow
- ✅ Password reset with token
- ✅ JWT-based authentication
- ✅ Dark floodlit-stadium aesthetic

## Design System

- **Background**: `#0A0D0B`
- **Card Surface**: `#14201A`
- **Primary Accent (Lime)**: `#D4FF3D`
- **Success (Green)**: `#21C55D`
- **Error (Red)**: `#FF5D5D`
- **Display Font**: Anton
- **Body Font**: Inter
- **Mono Font**: IBM Plex Mono

## Development Notes

- In development, verification and password-reset links are always printed in the backend terminal (`[DEV] ...`)
- Resend only delivers to allowed addresses until a domain is verified (see `backend/.env`)
- Screenshot OCR needs `GOOGLE_APPLICATION_CREDENTIALS`; without it, use direct score entry
- The home page shows recent tournaments for the signed-in user

## Production deploy

See **[DEPLOY.md](./DEPLOY.md)** for Render (API) + Vercel (frontend) + MySQL setup, env var checklists, InfinityFree caveats, and the Cloudinary upload warning.
# matchday
# matchday
# matchday
# matchday
# matchday
