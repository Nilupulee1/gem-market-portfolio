# Frontend

React and TypeScript frontend for the Gem Market Portfolio platform.

## Stack

- React 19
- TypeScript
- Vite
- Axios
- Zustand
- Tailwind CSS and Bootstrap

## Requirements

- Node.js 18+
- npm 9+

## Environment

Create a .env file in this folder if you want to override the API URL.

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

If VITE_API_URL is not set, the app uses http://localhost:5000/api.

## Install

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

Default app URL: http://localhost:5173

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Notes

- Ensure the backend is running before using authenticated or data-driven screens.
- Token-based auth is handled by Axios interceptors in src/api/axios.ts.
