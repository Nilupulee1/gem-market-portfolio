# Gem Market Portfolio

A full-stack gemstone marketplace and auction platform with role-based access for sellers, buyers, and admins.

## Tech Stack

- Frontend: React, TypeScript, Vite, Zustand, Axios, Tailwind CSS, Bootstrap
- Backend: Node.js, Express, TypeScript, MongoDB (Mongoose), JWT authentication
- Media: Cloudinary (gem image and asset handling)

## Project Structure

- `frontend/` - React + Vite client app
- `backend/` - Express API server

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- MongoDB Atlas (or another MongoDB instance)
- Cloudinary account

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/gem-marketplace?retryWrites=true&w=majority&appName=gem-marketplace
JWT_SECRET=<your-jwt-secret>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

Optional frontend environment (`frontend/.env`):

```env
VITE_API_URL=http://localhost:5000/api
```

If `VITE_API_URL` is not set, the frontend defaults to `http://localhost:5000/api`.

## Installation

Install dependencies for both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run in Development

Start backend:

```bash
cd backend
npm run dev
```

Start frontend in a second terminal:

```bash
cd frontend
npm run dev
```

- Frontend default URL: `http://localhost:5173`
- Backend health check: `http://localhost:5000/health`

## Build and Run Production

Backend:

```bash
cd backend
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

## Backend Scripts

From `backend/`:

- `npm run dev` - Run API in development with nodemon
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled API from `dist/server.js`
- `npm run reset-password -- <email> <newPassword>` - Reset a user password

Create initial admin user:

```bash
cd backend
npx ts-node scripts/createAdmin.ts
```

Default admin credentials created by the script:

- Email: `admin@gemfolio.com`
- Password: `admin123`

Change this password immediately after first login.

## Roles

The platform supports the following roles:

- `seller`
- `buyer`
- `admin`

## Notes

- `dist/` is generated only after running backend build and is intentionally ignored by git.
- Ensure CORS-allowed origins include your local frontend host (already configured for localhost/127.0.0.1).
