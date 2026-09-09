# EF MatchDay

A web app for organizing eFootball 1v1 tournaments.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: React + Vite
- **Authentication**: JWT with bcrypt password hashing

## Setup Instructions

### 1. Database Setup

1. Start your MySQL server (if using XAMPP, start MySQL from the XAMPP Control Panel)
2. Import the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   Or use phpMyAdmin to import `database/schema.sql`

3. Update database credentials in `backend/.env` if needed:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=ef_matchday
   ```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

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

- Email verification and password reset links are currently logged to the console (check backend terminal)
- Email sending will be implemented in a future step
- The home page is a placeholder showing user info
