# Noor frontend

React/Vite client for Noor, an Islamic audio streaming platform.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The development client runs at `http://localhost:3000`. Set
`VITE_API_BASE_URL` when the Fastify API is hosted elsewhere.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Main flows

- Public home, browse, search, artist, album, and audio streaming.
- Listener authentication, likes, follows, saved albums, history, and playlists.
- Artist profile, album, upload, catalog, and publication management.
- Administrator account, artist verification, role, and publication moderation.

The API URL and all media URLs are normalized through `src/lib/api.js`.

## Vercel deployment

Import this repository as a Vite project, set `VITE_API_BASE_URL` to the
deployed Render API origin, and use `dist` as the output directory. The checked
in `vercel.json` preserves React Router routes when opened directly.
