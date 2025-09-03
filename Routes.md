# Construction Backend API

Comprehensive documentation for the Express + Firebase backend that ingests audio recordings, produces AI transcriptions & summaries (Groq LLM + Whisper), organizes them into per-day consolidated records, supports semantic-like search, site (project) management, and admin cross‑user oversight.

## Base URL

```
http://<host>:<port>
```

Default `PORT` is `3000`. `HOST` defaults to `0.0.0.0`.

## Authentication

JWT Bearer tokens.

1. Signup (`/signup`) or login (`/login`) to receive a `token`.
2. Include header: `Authorization: Bearer <token>` on all protected routes.
3. Refresh with `/refresh` before expiry (tokens last 2h).

Roles:

- `user`: standard access to own data.
- `admin`: additionally can query all users' day recordings via admin routes.

Environment variables relevant to auth:

- `JWT_SECRET` (required)
- `ADMIN_ACCESS_KEY` (required to create an admin on signup)
- `ADMIN_SUPER_PASSWORD` (used conceptually; admins log in with `superPassword` field instead of `password`)

## Environment Variables (Core)

| Variable                   | Purpose                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `GROQ_API_KEY`             | Access Groq LLM + Whisper transcription APIs                                        |
| `JWT_SECRET`               | Sign / verify JWTs                                                                  |
| `ADMIN_ACCESS_KEY`         | Gate admin account creation                                                         |
| `ADMIN_SUPER_PASSWORD`     | (If used) super password logic (admins pass `superPassword` at login)               |
| `FIREBASE_SERVICE_ACCOUNT` | JSON (stringified) of Firebase service account; if absent local JSON file is loaded |
| `HOST`                     | Bind address (default 0.0.0.0)                                                      |
| `PORT`                     | Port (default 3000)                                                                 |

## Data Models (Simplified)

### Recording Upload (request body for `/recordings/save`)

```
{
	id: string,
	title: string,
	duration: string,            // mm:ss
	date: string,                // ISO date/time string
	jobNumber: string,
	type: string,                // arbitrary category
	audioFile: string,           // base64 (optionally data:audio/...;base64, prefix)
	transcription?: string,
	metadata?: {
		sampleRate?: number,
		channels?: number,
		bitRate?: number,
		fileSize?: number,         // <= 52428800
		mimeType?: 'audio/m4a' | 'audio/wav' | 'audio/mp3' | 'audio/mpeg'
	}
}
```

On upload the system:

1. Validates payload (Joi).
2. Saves audio temp file (50MB limit) under `temp/recordings`.
3. Transcribes via Groq Whisper.
4. Summarizes via Groq chat.
5. Consolidates into a per-day (YYYY-MM-DD_jobNumber) "day recording" document in Firestore (creating or updating). Includes aggregated transcription, summary, durations, file sizes.

### Site Object (`/sites` CRUD)

```
{
	id: string,            // Firestore generated
	name: string,
	siteId: string,        // unique business identifier
	companyName: string,
	stakeholders: string[],// emails
	isActive: boolean,
	createdAt: ISOString,
	createdBy: string      // creator email
}
```

### Day Recording (Firestore shape)

```
{
	id: 'YYYY-MM-DD_<jobNumber>',
	date: 'YYYY-MM-DD',
	jobNumber: string,
	userEmail: string,
	recordings: [ { id, title, duration, type, transcription, summary, metadata?, fileSize, uploadedAt } ],
	consolidatedTranscription: string,  // prefixed segments
	consolidatedSummary: string,        // AI consolidated
	totalDuration: string,              // mm:ss
	totalFileSize: number,              // bytes
	createdAt: ISOString,
	updatedAt: ISOString
}
```

## Route Catalogue

Routes grouped by domain. `Auth` column clarifies if bearer token is required. `Admin` indicates elevated privilege.

### Health & Diagnostics

| Method | Path                   | Auth               | Description                                                         |
| ------ | ---------------------- | ------------------ | ------------------------------------------------------------------- |
| GET    | `/health`              | No                 | Basic uptime/status heartbeat                                       |
| GET    | `/debug/user/:email`   | No (SHOULD REMOVE) | Inspect user doc (no password hash exposure). For development only. |
| POST   | `/debug/test-password` | No (SHOULD REMOVE) | Compares provided password vs stored hash. Development only.        |

### Authentication

| Method | Path       | Body                                                          | Notes                                                                              |
| ------ | ---------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| POST   | `/signup`  | `{ email, password, isAdmin?, accessKey? }`                   | `accessKey` must equal `ADMIN_ACCESS_KEY` for admin creation. Returns `{ token }`. |
| POST   | `/login`   | Admin: `{ email, superPassword }` User: `{ email, password }` | Returns `{ token }`.                                                               |
| POST   | `/refresh` | (none)                                                        | Auth required. Issues new token (2h).                                              |

### Recordings (User Scope)

| Method | Path                                         | Auth                | Description                                                                                                                                                                               |
| ------ | -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/recordings/save`                           | Yes                 | Upload and process one recording (base64 audio). Creates/updates related day recording.                                                                                                   |
| GET    | `/recordings`                                | Yes                 | List user's day recordings (summary view).                                                                                                                                                |
| GET    | `/recordings/:id`                            | Yes                 | Get one day recording (full). `:id = YYYY-MM-DD_<jobNumber>`.                                                                                                                             |
| GET    | `/recordings/:dayId/individual/:recordingId` | Yes                 | Retrieve a single individual recording embedded inside a day recording.                                                                                                                   |
| GET    | `/transcriptions?id=<dayRecordingId>`        | Yes                 | Get consolidated + individual transcriptions for a day.                                                                                                                                   |
| GET    | `/recordings/:id/summary`                    | (Currently NO auth) | Generates structured AI summary for a day recording for the (body) `email`. SECURITY NOTE: Should likely be protected; presently expects `email` in body — consider adding `verifyToken`. |

### Search

| Method | Path      | Auth | Body                | Description                                                                                                                                                                                                                                                        |
| ------ | --------- | ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/search` | Yes  | `{ query: string }` | LLM-driven intent detection; may return recordings (subset) or only an informational message. Uses hybrid keyword/date logic + LLM parsing. Response: `{ success, message, recordings[], count }`. `recordings[]` empty if intent is informational (e.g., counts). |

### Summaries (Cross-Day / Aggregated)

| Method | Path       | Auth           | Query       | Description                                                                                                                                                                                                                         |
| ------ | ---------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/summary` | No (Currently) | `jobNumber` | Overall multi-day aggregated summary across all users for a job. COMMENT: Previously admin-only; reconsider restricting. Response includes `summary.parsed?`, `raw`, `dates`, `count`, `includedEntries`, `fallbackUsed`, `source`. |

### Sites (Project Management)

| Method | Path         | Auth | Description                                            | Permissions            |
| ------ | ------------ | ---- | ------------------------------------------------------ | ---------------------- |
| GET    | `/sites`     | Yes  | List sites where user is creator or stakeholder        | User or Admin          |
| POST   | `/sites`     | Yes  | Create site (unique `siteId`)                          | Any authenticated user |
| GET    | `/sites/:id` | Yes  | Get specific site (must be creator or stakeholder)     | Access restricted      |
| PUT    | `/sites/:id` | Yes  | Update site (validates uniqueness of changed `siteId`) | Only creator           |
| DELETE | `/sites/:id` | Yes  | Delete site                                            | Only creator           |

### Admin (Cross-User Day Recording Access)

All require: user role == `admin` (validated after token decode).

| Method | Path                            | Query                                                | Description                                                     |
| ------ | ------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| GET    | `/admin/recordings`             | `jobNumber`, optional `limit` (default 100, max 500) | List day recordings for a job across all users.                 |
| GET    | `/admin/recordings/:id`         | `jobNumber`                                          | Single day recording (includes recordings + consolidated data). |
| GET    | `/admin/transcriptions/:id`     | `jobNumber`                                          | Consolidated + individual transcriptions only.                  |
| GET    | `/admin/recordings/:id/summary` | `jobNumber`                                          | Structured AI summary of a single day recording (admin).        |

### Response Conventions

Success responses commonly: `{ success: true, ... }`. Failures: `{ success: false, error: string, code? }` for business validation or generic errors.

Most list endpoints include: `count` and an array of entities.

### Common Status Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 200  | Success / retrieval          |
| 201  | Resource created             |
| 400  | Validation / bad input       |
| 401  | Missing / invalid token      |
| 403  | Forbidden (role / ownership) |
| 404  | Not found                    |
| 500  | Internal server error        |

## Typical Flows

### 1. User Registration & Upload

1. POST `/signup` => token
2. POST `/recordings/save` with Bearer token & audio payload
3. GET `/recordings` to see consolidated day entry
4. GET `/transcriptions?id=<dayId>` for textual content

### 2. Admin Multi-User Oversight

1. Admin POST `/login` with `superPassword`
2. GET `/admin/recordings?jobNumber=1234`
3. GET `/admin/recordings/:id?jobNumber=1234` for day details
4. GET `/admin/recordings/:id/summary?jobNumber=1234` for structured day summary
5. GET `/summary?jobNumber=1234` for overall project summary

## Example Requests

### Upload Recording

```
POST /recordings/save
Authorization: Bearer <token>
Content-Type: application/json

{
	"id": "rec_20250826_001",
	"title": "Morning Site Walk",
	"duration": "03:12",
	"date": "2025-08-26T14:05:00Z",
	"jobNumber": "JOB-4432",
	"type": "progress",
	"audioFile": "data:audio/m4a;base64,AAA...",
	"metadata": {"mimeType": "audio/m4a"}
}
```

Response:

```
{ "success": true, "id": "rec_20250826_001", "message": "Recording uploaded and consolidated successfully" }
```

### Search

```
POST /search
Authorization: Bearer <token>
{
	"query": "show me recordings about safety from yesterday"
}
```

Response (may or may not include `recordings` depending on intent):

```
{ "success": true, "message": "Found 2 day recordings ...", "recordings": [ ... ], "count": 2 }
```

## Security Notes & Recommendations

1. Protect `/recordings/:id/summary` with `verifyToken` (currently not enforced, relies on body email).
2. Consider re-enabling admin restriction on `/summary` if data should not be publicly aggregatable.
3. Remove `/debug/*` endpoints in production builds.
4. Enforce rate limiting & size checks (current audio size limit 50MB).
5. Sanitize and validate `jobNumber` / `id` when used in queries / path params.

## Local Development

1. Provide `construction-dev-2a63b-*.json` or set `FIREBASE_SERVICE_ACCOUNT`.
2. Set env vars in `.env`.
3. Install deps: `npm install`.
4. Run: `npm start` (or `ts-node src/index.ts` depending on setup).

## Error Handling Patterns

Consistent JSON with `success:false` + `error` message. Some validation errors add a `code` (e.g., `VALIDATION_ERROR`, `FILE_TOO_LARGE`). Client should branch primarily on HTTP status then optionally on `code`.

## Future Enhancements (Suggested)

- Add pagination for listing endpoints.
- Implement soft delete for sites / recordings.
- Add per-recording file storage (e.g., Firebase Storage) instead of temp filesystem.
- Add explicit search index (e.g., Algolia / OpenSearch) for scalable keyword search.
- Harden unauthenticated routes & remove debug endpoints via environment flag.
- Add OpenAPI/Swagger generation for automated client SDKs.

---

Generated documentation reflects repository state as of current commit. Keep this file updated with new routes or contract changes.
