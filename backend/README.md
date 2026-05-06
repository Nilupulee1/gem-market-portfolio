# Backend

Express and TypeScript API server for the Gem Market Portfolio platform.

## Stack

- Node.js
- Express 5
- TypeScript
- MongoDB and Mongoose
- JWT authentication
- Cloudinary for media storage

## Requirements

- Node.js 18+
- npm 9+
- MongoDB URI
- Cloudinary credentials

## Environment

Create a .env file in this folder using .env.example.

Required variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/gem-marketplace?retryWrites=true&w=majority&appName=gem-marketplace
JWT_SECRET=<your-jwt-secret>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

## Install

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

Health check endpoint:

- http://localhost:5000/health

## Build and Run

```bash
npm run build
npm start
```

This compiles TypeScript to dist and runs dist/server.js.

## Available Scripts

- npm run dev: Run server with nodemon and TypeScript source
- npm run build: Compile TypeScript using tsc
- npm start: Run compiled server from dist/server.js
- npm run reset-password -- <email> <newPassword>: Reset an existing user password

## Admin Bootstrap

Create the default admin user:

```bash
npx ts-node scripts/createAdmin.ts
```

Default credentials created by the script:

- Email: admin@gemfolio.com
- Password: admin123

Change the password after first login.

## API Routes

Base route prefix:

- /api

Main route groups:

- /api/auth
- /api/gems
- /api/auctions
- /api/admin
- /api/buyer
