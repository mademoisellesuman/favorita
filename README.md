# Favorita
![CI](https://github.com/mademoisellesuman/favorita/actions/workflows/ci.yml/badge.svg)

A community-driven affiliate product discovery platform for skincare and makeup.
Users recommend products and attach up to three shop links (Shopee, Lazada, TikTok Shop).
Shoppers browse, search, save favorites, and buy on the shop of their choice.
Favorita has no checkout of its own.

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (ES modules)
- **Backend:** Node.js, Express 5
- **Database:** MongoDB Atlas, via Mongoose
- **Auth:** bcrypt password hashing, JWT
- **Planned:** Docker, GitHub Actions CI/CD, Vercel (frontend) + a Node host (backend)

## Run it locally

Requires Node.js 20+ and a free MongoDB Atlas cluster.

```bash
cd backend
npm install
cp .env.example .env     # Windows: copy .env.example .env
```

Edit `backend/.env`: add your `MONGODB_URI` and a generated `JWT_SECRET`
(see the comments in `.env.example`). Then:

```bash
npm run seed             # loads sample data (development only)
npm run dev
```

Open http://localhost:5000. Sample accounts all use the password `Password123`
(development data only): `ana_glow`, `mika_beauty`, `joy_skin`.

## Run it with Docker

Requires Docker Desktop. Uses the same `backend/.env` as above.

```bash
docker compose up --build --watch
```

## Testing

Tests use a separate database (its name must end in `_test`, because tests wipe it).
Put `TEST_MONGODB_URI=...` in `backend/.env.test`, then:

```bash
cd backend
npm run lint
npm test
```

Open http://localhost:5000. See `docker-compose.local-db.yml` for an optional local MongoDB.

## Project structure

```
frontend/   static site (index.html, css/, js/)
backend/    Express API
  src/config, controllers, middleware, models, routes, utils, validators
  requests/   .http files for testing the API (VS Code REST Client)
```

## Security notes

Passwords are hashed with bcrypt, sessions use revocable JWTs, all input is
validated on the server, and affiliate redirects only go to allow-listed shop domains.
Never commit `.env`.