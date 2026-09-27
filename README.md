# Roomy

Roomy is a personal room inventory and approximate 2D layout-planning web
application. It helps people record belongings, remember where items are
stored, and organise rooms while rearranging or decorating their space.

> **Current progress:** Demo mode still works in the browser. The Roomy Express
> API, PostgreSQL migrations, Supabase authentication integration, private photo
> routes, and saved planner are implemented locally. Supabase has been configured
> for local testing; production deployment is still pending.

**Live site:** Not deployed yet
**API:** Implemented locally; live configuration pending
**Demo video:** To be added

## What it does

Roomy is designed for people who want a visual and organised way to keep track
of belongings in bedrooms and other personal rooms. Users can create rooms,
record items, identify storage relationships, search an inventory, and preview
basic item dimensions for future room-planning features.

## Built with

### Frontend

- React 18
- Vite 6
- Tailwind CSS 4
- Browser `localStorage` for demo mode; Supabase Auth and Express API in real mode

### Backend

- Node.js 20+, Express, PostgreSQL, and `pg`
- Supabase for PostgreSQL hosting, email/password authentication, and private photos
- Hosting: frontend/API provider selection pending

The real mode uses the Express API for inventory and layouts. External services
must be configured before that mode can run.

## Setup and installation

### Requirements

- Node.js 20 or newer (tested locally with Node.js 24)
- npm
- Git

Demo mode does not require PostgreSQL, Supabase, or an API server. Real mode does.

### Clone and install

```powershell
git clone https://github.com/Matt-CRL/roomy.git
cd roomy\client
npm ci
Copy-Item .env.example .env

cd ..\server
npm ci
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead of `Copy-Item`.

## Demo mode

The current application is intentionally running as a browser-only demo. Room
and item state is held in React and persisted to the visitor’s local storage,
so the interface can be developed and demonstrated before the real API and
database are available.

Set `VITE_USE_MOCK_API=true` in `client/.env` for this mode. The demo notice is
visible; demo data is separate from any real account and is not imported
automatically.

## Running it yourself

From the `client/` directory, run:

```powershell
npm run dev
```

Open the address printed by Vite, normally:

```text
http://localhost:5173
```

In demo mode, the first screen opens the Bedroom 1 inventory. A new real
account opens the Rooms page so the user can create their first room. Use the navigation to visit
the Rooms page, enter a room, add or edit items, and switch between grid and
list views.

To verify that the production build works:

```powershell
npm run build
npm run preview
```

### Run with Supabase and PostgreSQL

1. Create a Supabase project. Enable email/password authentication and create
   a **private** Storage bucket named `roomy-item-photos`. Keep the database
   password and secret key out of Git.
2. In `server/.env`, set `DATABASE_URL`, `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. Set
   `MIGRATION_DATABASE_URL` if migrations use a separate database account.
3. In `client/.env`, set `VITE_USE_MOCK_API=false`, `VITE_API_BASE_URL`,
   `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. From `server/`, run `npm run db:migrate` once. The migration runner tracks
   applied files and does not seed or erase user data.
5. In one terminal, run `npm run dev` from `server/`. In another, run
   `npm run dev` from `client/`. Open `http://localhost:5173` and sign up.

If Supabase requires email confirmation, use the link it emails you before
signing in. The first real account starts with no rooms. Add a room with width
and depth in centimeters, then add items. `/healthz` checks the API process;
`/readyz` checks its database connection.

Use a database login with only the required table permissions for the running
API. Keep schema privileges on a separate migration login. The migration
scripts create the tables; the old `server/db/schema.sql` and `seed.sql` are
from the sightings template and must not be run for Roomy.

After migrating with the project owner connection, one way to create the API
login is to run the following in the Supabase SQL editor, replacing the example
password with your own strong random value. Put that login's connection string
in `DATABASE_URL` and the owner connection in `MIGRATION_DATABASE_URL`:

```sql
CREATE ROLE roomy_api LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT CONNECT ON DATABASE postgres TO roomy_api;
GRANT USAGE ON SCHEMA public TO roomy_api;
GRANT SELECT ON roomy_categories TO roomy_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  roomy_rooms, roomy_items, roomy_layouts, roomy_layout_items,
  roomy_photo_cleanup TO roomy_api;
```

The database password, Supabase secret key, and real URLs belong only in
ignored local `.env` files or deployment secrets. Use the connection string
format shown by your Supabase project's database settings; its pooler and TLS
details depend on where the API runs.

## Environment variables

The demo needs no secrets. The real application needs these variables:

| Variable | Example value | Purpose |
| --- | --- | --- |
| `VITE_USE_MOCK_API` | `false` | Uses the Express API; `true` keeps browser demo mode. |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Express API base URL. |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Public Auth project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_replace_me` | Public browser key. |
| `DATABASE_URL` | `postgresql://roomy_api:password@host:5432/postgres` | Server-only PostgreSQL login. |
| `MIGRATION_DATABASE_URL` | `postgresql://admin:password@host:5432/postgres` | Optional separate migration login. |
| `DATABASE_SSL_CA_FILE` | `C:\path\outside-repo\supabase-ca.pem` | Optional local path to the database root certificate for verified TLS. |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Server's Auth and Storage project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_replace_me` | Server's public Auth project key. |
| `SUPABASE_SECRET_KEY` | `sb_secret_replace_me` | Server-only key for private photo storage. |
| `SUPABASE_PHOTO_BUCKET` | `roomy-item-photos` | Private Storage bucket name. |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed frontend origins. |
| `NODE_ENV` | `development` | Runtime mode; use `production` on a host. |
| `PORT` | `3000` | Optional local API port; hosting providers normally set it. |

Values beginning with `VITE_` are compiled into the frontend and are public.
Never put passwords, database connection strings, or private keys in them.

Do not put `DATABASE_URL` or `SUPABASE_SECRET_KEY` in `client/.env`. Change
frontend `VITE_` values before building; Vite embeds them at build time.

## Features and usage

### Rooms

- View room, item, and storage summaries.
- Add a room with a custom name.
- Enter a room by double-clicking its room card on desktop or tapping it on mobile.
- Rename or delete a room from its three-dot menu.
- Deleting a room also removes the items assigned to it after confirmation.

### Room inventory

- Add an item to the selected room.
- Edit an item’s name, category, notes, storage status, and planner dimensions.
- Move an item to another room.
- Delete an item after confirmation.
- Search items by name, category, or storage information.
- Filter between all items, regular items, and storage units.
- Filter by grouped categories such as Furniture & decor, Electronics,
  Clothing & personal, Kitchen, Books & documents, and Storage & household.
- Switch between grid and list views.
- Open an item focus preview by selecting an inventory card.
- Open a storage unit’s separate inventory sidebar to view stored items.

### Item form and planner preview

- Item names are limited to 80 characters.
- Notes are limited to 500 characters.
- Width and depth values update the basic rectangle preview.
- Width and depth cannot be set below 1 cm.
- Storage units display their stored-item count.
- Regular items display whether they are stored or unstored.

### Theme

Use the light-switch control at the top-right of the page to toggle between
Light mode and Night mode.

### Data behavior

Demo changes are saved in the current browser’s `localStorage`. Real mode sends
them to PostgreSQL through Express and scopes every record to the signed-in
user. Switching modes does not transfer demo data into a real account.

### API routes

All `/api` routes require a Supabase access token in the `Authorization: Bearer`
header. `/healthz` and `/readyz` are public.

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/api/rooms` | List rooms with counts; create a room. |
| GET, PATCH, DELETE | `/api/rooms/:roomId` | Read, rename/resize, or delete a room. |
| GET | `/api/categories` | List the fixed category choices. |
| GET, POST | `/api/rooms/:roomId/items` | Search/filter/paginate items; create one. |
| GET, PATCH, DELETE | `/api/items/:itemId` | Read, update, or delete an item. |
| GET | `/api/items/:itemId/contents` | List stored items and a confirmation version. |
| POST | `/api/items/:itemId/move` | Move an item to another room. |
| GET, PUT | `/api/rooms/:roomId/layout` | Load/save one room layout with a revision. |
| GET, POST, DELETE | `/api/items/:itemId/photo` | Download, upload, or remove a private photo. |

For a nonempty storage unit, move/delete requires `includeContents` and the
`contentsVersion` returned by the contents route. Including items moves or
deletes them with the storage unit. Excluding items leaves them unstored in
their original room. A changed version returns `409`, prompting a fresh review.
Requests use JSON except photo upload, which uses raw JPEG/PNG/WebP bytes.

## Deploying

No final live deployment has been verified. The real mode needs a deployed
Express process and Supabase project; the frontend host choice is pending.

The repository contains a deployment workflow inherited from the class
template, but it has not been configured as the project’s final deployment.
Set the server environment variables on the API host and run migrations with a
privileged connection. Set the public `VITE_` values on the frontend host,
rebuild, and add that frontend origin to `CORS_ORIGINS`. Then verify two real
accounts cannot access one another's rooms or item IDs. The live site, API,
and demo video links will be added after deployment.

## Project structure

```text
client/
  src/
    App.jsx                 Main application state and page switching
    pages/                  Rooms, inventory, item form, and related screens
    components/             Reusable room, item, layout, and common UI pieces
    assets/                 Local fallback icons and images
    api/                    Matching demo/HTTP adapters and Supabase Auth client
  .env.example              Frontend environment variable template
  package.json              Frontend scripts and dependencies
server/
  app.js                    Protected Roomy HTTP routes and errors
  roomyRepo.js              Parameterized SQL and transactions
  auth.js                   Supabase session verification
  photos.js                 Private Storage operations and cleanup retry
  db/migrations/            Versioned Roomy schema
  db/migrate.js             Migration runner
docs/                       Planning notes and project documentation
.github/workflows/          Deployment workflow inherited from the template
AI-USAGE.md                 Record of AI assistance and project decisions
```

## Architecture

Demo flow:

```text
React/Vite/Tailwind frontend
            |
            v
   React state in App.jsx
            |
            v
     Browser localStorage
```

Real mode flow:

```text
React/Vite/Tailwind frontend
            |
            v
       Express API ─────── Supabase Auth (verify session)
        /       \
       v         v
 PostgreSQL   private Supabase Storage
```

Express derives ownership from a verified session, validates requests, and
uses parameterized SQL for inventory and layouts. Storage moves/deletions run
in database transactions. The planner saves logical coordinates measured in
centimeters against each room's specified width and depth; resizing a planner
shape does not change the item's optional reference measurements.

## Screenshots

### Authentication page

![Roomy authentication page](docs/assets/auth-page.png)

### Rooms page

![Roomy Rooms page](docs/assets/rooms-page.png)

### Add Room planner preview

![Roomy Add Room planner preview](docs/assets/add-room-planner.png)

### Room inventory

![Roomy room inventory page](docs/assets/room-inventory.png)

### Add Item form

![Roomy Add Item form](docs/assets/add-item-form.png)

These screenshots show the current Roomy frontend running locally. Production
deployment is still pending.

## Known issues and next steps

- The complete real-mode flow still needs verification with two separate
  accounts, especially ownership isolation and Row Level Security behavior.
- The planner is still an early version and needs to be finalized with more
  complete layout editing and placement behavior.
- The website responsiveness still needs further testing and polish across
  smaller screens and mobile device layouts.
- The app has not been verified on a production frontend/API/database host.
- Demo browser data is not imported into real accounts automatically.
- The old sightings template files remain in `server/db/`; only
  `npm run db:migrate` applies the Roomy schema.

The remaining work is focused on finalizing the planner, improving responsive
layouts, completing real-mode security testing, and deploying the application.

## What I would do next

1. Finalize the planner’s layout editing, item placement, and save/reload
   behavior.
2. Test the complete real-mode flow with two accounts, including rooms, items,
   storage decisions, photo uploads, layouts, and cross-account isolation.
3. Test and polish the responsive layouts on mobile and smaller desktop widths.
4. Prepare production deployment by configuring the least-privilege API
   database login, frontend/API environment variables, CORS, and migrations.
5. Deploy the API and frontend, then update the live links, screenshots, and
   final demonstration materials.

## Author

Matt Christian R. Lara
Bachelor of Science in Computer Science, CS-404

## Documentation

- [Project proposal and design notes](docs/README.md)
- [Backend API contract and setup](docs/backend.md)
- [AI usage record](AI-USAGE.md)
- [Class starter instructions](START-HERE.md)

## AI use

ChatGPT/Codex assisted with parts of the frontend, backend planning and
implementation, and code review. The dated record of prompts, decisions, and
corrections is available in
[AI-USAGE.md](AI-USAGE.md).

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

## License

MIT, see [LICENSE](https://github.com/Matt-CRL/roomy/blob/main/LICENSE).
