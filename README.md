# BusinessCatch by Hansraj

BusinessCatch helps find local businesses by location, inspect whether they list a website, mark outreach status, and export filtered leads to CSV.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Framer Motion
- OpenStreetMap data through Nominatim and Overpass

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Checks

```bash
npm run lint
npm run build
```

The app uses a lightweight Next route at `/api/businesses` to query OpenStreetMap server-side. This keeps the browser free of external API CORS issues and avoids shipping browser automation dependencies to Vercel.

## Deploying to Vercel

Use Vercel's default Next.js settings:

- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave empty

No required environment variables are needed for the current OpenStreetMap-backed deployment.
