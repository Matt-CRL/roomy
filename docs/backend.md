# Roomy backend contract

The Express service uses PostgreSQL for rooms, items, storage relationships, and
one saved layout per room. Supabase Auth supplies email/password sessions, and a
private Supabase Storage bucket holds optional item photos. Every `/api` call
requires a signed-in user's access token. The API verifies it with Supabase Auth
and derives ownership from the verified user ID; request bodies cannot choose
an owner. Each authenticated request sets that UUID as a transaction-local
database setting on the same connection used for its queries. RLS provides a
second owner check; production startup rejects owner/BYPASSRLS runtime roles.

## Set up

Use Node.js 20 or newer. Follow the root [README](../README.md) and
[security rollout runbook](../server/SECURITY-ROLLOUT.md) for Supabase project
setup, roles, `.env` variables, the private bucket, migrations, and run
commands. Runtime settings belong in `.env`; reviewed migrations use the
separate ignored `.env.migrate` file, copied from `.env.migrate.example`, so
the migration login is not loaded by the API. Migrations are recorded in
`roomy_migrations` and do not clear user data.

## Main requests

Create a room:

```http
POST /api/rooms
Authorization: Bearer <user-access-token>
Content-Type: application/json

{"name":"Bedroom","widthCm":400,"depthCm":320}
```

Both dimensions are centimeters and must be positive. A room can be created
without dimensions through the API, but a saved layout requires both. Room
names are unique per user after trimming and ignoring case.

Create a storage unit:

```http
POST /api/rooms/<room-uuid>/items
Authorization: Bearer <user-access-token>
Content-Type: application/json

{"name":"Wardrobe","category":"Furniture","notes":"","isStorageUnit":true,"parentStorageId":null,"widthCm":120,"depthCm":55}
```

Create a regular item inside it by setting `isStorageUnit:false` and
`parentStorageId` to the wardrobe's UUID. The parent must be an owned storage
unit in the same room. Storage units cannot be nested. The item response
includes `storedCount` for storage units; this is computed from actual children.
`widthCm` and `depthCm` are optional but must be supplied together. Item
responses also include `photoFit` (`cover` or `contain`) and `photoPosition`
(`center`, `top`, `bottom`, `left`, or `right`) for backwards compatibility.
The current photo editor stores `photoPositionX`, `photoPositionY` (0–100%)
and `photoZoom` (1–2) so users can drag and zoom the crop used by inventory
cards. Existing items default to the centered, unzoomed crop.

Find items:

```http
GET /api/rooms/<room-uuid>/items?q=lamp&type=item&categories=Electronics&limit=100&offset=0
Authorization: Bearer <user-access-token>
```

`type` is `all`, `item`, or `storage`. Text search includes the item name,
category, and parent storage name. Comma-separated categories use OR within
the category group, combined with text and type filters using AND. Results are
ordered by creation time and ID. Room counts from `GET /api/rooms` remain
unfiltered.

Before moving or deleting a nonempty storage unit, call
`GET /api/items/<item-uuid>/contents`. It returns `{ "items": [...],
"contentsVersion": "..." }`. Show the items and ask whether to include them.

```http
POST /api/items/<item-uuid>/move
Authorization: Bearer <user-access-token>
Content-Type: application/json

{"targetRoomId":"<other-room-uuid>","includeContents":false,"contentsVersion":"<reviewed-version>"}
```

For deletion, send `DELETE /api/items/<item-uuid>` with the same two decision
fields in the JSON body. `includeContents:true` moves or deletes the children
with the storage unit. `false` leaves them in the original room and clears
their storage parent. A changed version returns `409`; refresh and ask again.
Regular and empty items do not need a contents decision. These multi-row
changes run in one SQL transaction.

Save a layout after setting room dimensions:

```http
PUT /api/rooms/<room-uuid>/layout
Authorization: Bearer <user-access-token>
Content-Type: application/json

{"revision":0,"items":[{"itemId":"<item-uuid>","x":20,"y":35,"width":120,"depth":55,"rotation":0,"color":"#f97316"}]}
```

`GET /api/rooms/<room-uuid>/layout` returns the current revision and shapes.
The save replaces that room's placements and increments the revision. A stale
save returns `409`. Coordinates and footprints are approximate centimeters
relative to the room. Saving a changed shape footprint updates that item's
Width/Depth values. Stored items cannot be placed individually on the planner.

Upload a photo with `POST /api/items/<item-uuid>/photo`, sending raw image
bytes and a matching JPEG, PNG, or WebP `Content-Type`. Maximum size is 4 MiB
(4,194,304 bytes), leaving room below Vercel Functions' 4.5 MB request limit.
The bucket is private. `GET` proxies the owner's photo through Express, and
`DELETE` removes its reference. Removed/replaced objects enter a durable SQL
cleanup queue through the separate `PHOTO_CLEANUP_DATABASE_URL` role. Local
development retries every five minutes; on Vercel, the API schedules a bounded
post-commit cleanup attempt and a secret-protected daily cron retries the
remaining jobs. Vercel Hobby runs cron once per day with up to 59 minutes of
scheduling variation, so cleanup can be delayed during an outage or backlog.
The client never receives the Supabase secret key or permanent public photo URLs.

The Vercel API exposes `GET /api/cron/photo-cleanup` for its scheduled job.
Requests require `Authorization: Bearer <CRON_SECRET>`; the route returns no
photo paths or user data. Do not call it from the browser or expose its secret.

## Vercel hosting

The application is prepared for two Vercel projects connected to this
repository: a Vite static frontend with root directory `client`, and the
Express API with root directory `server`. The frontend uses `npm run build`
and `dist`; its Vercel config provides SPA deep-link rewrites and response
security headers. The server exports the Express app for Vercel Functions and
runs the same fail-closed production configuration, database/RLS, and private
Storage preflights before serving requests. The existing `server.js` remains
the local development entry point.

The backend's runtime needs `DATABASE_URL`, `PHOTO_CLEANUP_DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`SUPABASE_PHOTO_BUCKET`, `CORS_ORIGINS`, `NODE_ENV=production`,
`PUBLIC_HTTPS=true`, and a random `CRON_SECRET` of at least 32 characters.
For Vercel TLS, provide `DATABASE_SSL_CA` as backend-only PEM contents if the
host does not already trust the database certificate; a laptop file path will
not work in the hosted Linux runtime. Never add `MIGRATION_DATABASE_URL` to the
running API project. The browser build separately needs the four `VITE_`
settings listed in the root README; only the Supabase URL and publishable key
are intended to be public.

The Vercel config files and local tests do not prove that a project is deployed.
The Vercel domains, environment variables, CORS allowlist, Supabase Auth site
URL/redirects, SMTP delivery, backup/recovery, browser workflows, actual
response headers, and a real daily cron invocation must still be configured
and checked before sharing the site publicly.

## Responses and verification

The API uses `201` for creation, `204` for deletion, `400` for validation,
`401` for missing/expired sessions, `404` for absent or unowned records, `409`
for duplicate/stale changes, `413` for oversized images, `415` for unsupported
image content, and `503` when a required external service is unavailable.
Errors are JSON with an `error` string and optional `fields` object.

The local tests run with `npm test` in `server/` and include transaction-context,
production configuration, policy/role preflight logic, and unauthenticated
HTTP checks. These tests do not replace checks against a real database or
manual browser testing.

### Verified database security results — 2026-10-05; preflight rechecked 2026-10-08

The project used for QA was renamed by its owner to `roomy-production` and is
now the selected Roomy database. These checks were run against that same
Supabase project; renaming its dashboard display name did not change its
project URL or credentials. The 2026-10-08 read-only preflight passed again
using the persistent local API configuration. This does not verify a deployed
environment or the separate original Supabase project, which remains unchanged.

- All migrations (001–005) were applied. Separate runtime and
  photo-maintenance logins passed the database security preflight, including
  expected role permissions and row-level security (RLS) policies.
- Direct runtime SQL checks blocked access with missing or incorrect user
  identity, including cross-owner reads and writes. Transaction-local user
  identity cleared after rollback, and alternating concurrent API requests
  remained isolated.
- Two disposable Auth accounts passed room/item ownership checks.
  Cross-account reads, updates, and deletes returned not-found, and anonymous
  Supabase Data API access was denied. Disposable account deletion succeeded.
- A private photo was uploaded and downloaded only by its owner. Invalid
  image signatures were rejected; deletion queued cleanup, and the separate
  maintenance worker removed the object. An anonymous caller could not list
  or download the temporary Storage object.
- Planner API checks passed decimal dimension persistence, rotated boundary
  validation, cross-account layout denial, and rejection of stored-item and
  duplicate placements. Stale saves preserved the existing layout; concurrent
  saves allowed one writer and rejected the conflicting writer.
- The API health and readiness endpoints returned `200`, and an
  unauthenticated protected rooms request returned `401`. Configured CORS and
  API security headers were present.
- All 23 local server tests passed. The 7 client configuration tests and
  earlier demo/synthetic HTTPS release builds also passed; these are not
  evidence of complete browser coverage.

Temporary test users, records, and photo objects were cleaned up after the
checks. No credentials or session tokens are included in this documentation.

### Still unverified

The selected `roomy-production` project has the tested role/RLS setup and
passed the read-only security preflight again on 2026-10-08. The separate
original Supabase project has not received these changes and is not the
selected app database. Database/Storage backup and recovery coverage, manual
browser workflows, production hosting, Auth redirects, CORS, host security
headers, and deployed frontend/API/database behavior still require their own
review and verification. See the [security rollout record](../server/SECURITY-ROLLOUT.md)
for historical findings on the original project and the current boundary.

Detailed browser coverage remains pending for signup/login and session
behavior, inventory/storage workflows, photo editing, planner
drag/resize/rotate, undo/redo, debounced autosave/manual save, and error
recovery. Responsive layouts, keyboard accessibility, and both themes also
need recorded results. API persistence and conflict checks do not prove those
interactive UI behaviors work.
