# Roomy backend contract

The Express service uses PostgreSQL for rooms, items, storage relationships, and
one saved layout per room. Supabase Auth supplies email/password sessions, and a
private Supabase Storage bucket holds optional item photos. Every `/api` call
requires a signed-in user's access token. The API verifies it with Supabase Auth
and derives ownership from the verified user ID; request bodies cannot choose
an owner.

## Set up

Use Node.js 20 or newer. Follow the root [README](../README.md) for Supabase
project setup, `.env` variables, the private bucket, package installation,
migrations, and run commands. Run `npm run db:migrate` from `server/` with an
account that can create tables. Do not use the old sightings seed/reset files.
Migrations are recorded in `roomy_migrations` and do not clear user data.

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
relative to the room. Changing a shape's footprint does not change the item's
separate Width/Depth reference fields. Stored items cannot be placed
individually on the planner.

Upload a photo with `POST /api/items/<item-uuid>/photo`, sending raw image
bytes and a matching JPEG, PNG, or WebP `Content-Type`. Maximum size is 5 MB.
The bucket is private. `GET` proxies the owner's photo through Express, and
`DELETE` removes its reference. Removed/replaced objects enter a durable SQL
cleanup queue, retried by the running server every five minutes. The client
never receives the Supabase secret key or permanent public photo URLs.

## Responses and verification

The API uses `201` for creation, `204` for deletion, `400` for validation,
`401` for missing/expired sessions, `404` for absent or unowned records, `409`
for duplicate/stale changes, `413` for oversized images, `415` for unsupported
image content, and `503` when a required external service is unavailable.
Errors are JSON with an `error` string and optional `fields` object.

The local validation and unauthenticated HTTP tests run with `npm test` in
`server/`. A real Supabase project is still needed to verify migration,
multi-user isolation, SQL transactions, photo upload/download/cleanup, and
planner save/reload end to end. Do not claim those checks passed until they do.
