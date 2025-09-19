# Frontend Migration Guide (Node backend -> Rust backend)

This guide maps the old Node routes to the new Rust API, highlights all breaking changes, and shows exactly what the React Native (Expo) app needs to update. The Rust API favors site ObjectIds over jobNumber strings and consolidates day data into a simpler model.

### 2025-09-08 — Password reset now uses 6-digit OTP

- Change: Password reset codes are now 6-digit numeric OTPs instead of 32-byte alphanumeric tokens.
- No schema change required; existing records in `password_resets` will expire via TTL.
- FE: Update UI copy and validation to accept a 6-digit code; clearly indicate 15-minute expiry.

## Summary of Key Changes

- Use `site` ObjectId (Mongo `_id`) instead of `jobNumber` for API calls.
- Recording uploads are multipart to `/recording/upload` with `file`, `job_id`, and `local_date`.
- Day logs are listed/fetched by the new `/recording/*` routes; images are surfaced in the summary endpoint.
- Search, images, email, and progress endpoints exist with small parameter changes.
- Admin endpoints are available; FE currently does not call them.

## Base URL and Headers

- All protected routes: `Authorization: Bearer <jwt>`.
- Health: `GET /health` returns `{ status: "OK", timestamp }`.

## Auth

- Sign in: `POST /auth/signin` (replaces `/login`).
- Sign up: `POST /auth/signup` (replaces `/signup`).
- Forgot/reset password (new):
  - `POST /auth/forgot-password` → `{ email }` (emails a 6-digit OTP; valid for 15 minutes)
  - `POST /auth/reset-password` → `{ email, reset_code, new_password }` (`reset_code` must be the 6-digit OTP)
  - Refresh: Not implemented. Remove automatic refresh flow or switch to re-login on expiry until `/auth/refresh` is added.

## Sites

- List sites (accessible to user): `GET /sites` → `{ sites: [...] }`
- Create site: `POST /sites` → `{ id }`
- Get one: `GET /sites/:id`
- Update: `PUT /sites/:id`
- Delete: `DELETE /sites/:id`
- Access: all authenticated users have the same permissions as the creator.
- FE data model: retain both business `site_id` (string) and Mongo `_id` (ObjectId). Use `_id` for API calls; display `site_id` in UI.

## Recording Uploads

- Old: `POST /recordings/save` (JSON/base64 or multipart, using jobNumber)
- New: `POST /recording/upload` (multipart)
  - Fields:
    - `file`: the audio file (required)
    - `job_id`: site `_id` (ObjectId) (required)
    - `local_date`: `YYYY-MM-DD` (user’s timezone) (required)
    - `title`: string (optional)
    - `duration`: `MM:SS` (optional, trusted)
    - `tz`: IANA timezone string (optional)
  - Limits/validation:
    - Size: strictly < 25MB
    - Types: `audio/m4a`, `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/mp4`
  - S3 key: `recordings/{site_oid}/{local_date}/{uuid}.{ext}`

## Day Logs (List, Details, Streaming)

- List day logs for a site (site-wide access for all users):
  - `GET /recording/day-logs?job_id=<site_oid>` → `[{ id, local_date, tz, total_duration, recording_count, created_at, updated_at, contributors: [emails] }]`
- Get one day log (site-wide access, streaming URLs included):
  - `GET /recording/day/:id` → `{ id, site, local_date, transcriptions, total_duration, contributors: [emails], recordings: [{ id, s3_key, url, duration, uploaded_at, title, mime_type, file_size }] }`
- Delete day log (admin-only):
  - `DELETE /recording/day/:id` → cascades: removes audio files + associated images from S3 and Mongo

## Summary (Structured JSON) + Images

- Get/generate structured summary for a day (site-wide access):
  - `GET /recording/day/:id/summary` → `{ day_id, site, local_date, contributors: [emails], summary: <JSON>, images: [{ id, url, s3_key, mime_type, file_size, uploaded_at, original_name }] }`
  - Summary is generated once from the consolidated transcriptions and persisted.
  - Summary JSON example (shape used by the LLM prompt):
    ```json
    {
      "date": "",
      "jobId": "",
      "labor": [{ "role": "", "startTime": "", "finishTime": "", "hours": 0 }],
      "subcontractors": [{ "name": "", "numberOfEmployees": 0, "hours": 0 }],
      "materials": [{ "name": "", "quantity": 0, "unitOfMeasure": "" }],
      "equipment": [{ "name": "", "daysUsed": 0 }],
      "dailyActivities": "",
      "issues": [""],
      "progressPhotos": false
    }
    ```
- Edit stored summary:
  - `PUT /recording/day/:id/summary` → `{ summary: <JSON> }`
- Note: images are returned with the summary (not the list route). If you need them in the detail route too, we can add it.

## Images

- Upload image:
  - Old: `POST /images/upload` with `image`, `jobNumber`, `recordingId`
  - New: `POST /images/upload` with `image`, `job_id` (site `_id`), `day_id` (day log `_id`), `metadata?`
  - Validations: image only, size ≤ 10MB
  - S3 key: `images/{site_oid}/{day_id}/{uuid}.{ext}`
- Delete image:
  - `DELETE /images/:id` (owner or admin)
- Read: images are included in `GET /recording/day/:id/summary` (with presigned URLs).

## Search

- `POST /recording/search` → `{ job_id: <site_oid>, query: string }`
- Returns `{ message: string|null, day_logs: [{ id, local_date, ... }] }`
- Prefiltered by Mongo text index; prompts LLM with day-only metadata.

## Email Day Report (PDF)

- Old: `POST /email-day-recording` with `dayRecordingId`, `pdf`
- New: `POST /recording/email-day-recording` with `day_id`, `pdf` (application/pdf)
- Recipients: site stakeholders; body includes site/date/duration/recording count

## Progress

- Old FE calls: `GET /progress?jobNumber=...`
- New: `GET /progress?site=<site_oid>` (site filter optional)
  - Returns task completion flags (dailyActivities, labour, subcontractors, materialsDeliveries, equipment) and completion percentage for today’s most recent day log within that filter.

## Admin (available if needed)

- List day logs for a site: `GET /admin/recordings?site=<site_oid>&page=&limit=`
- Get day log: `GET /admin/recordings/:id?site=<site_oid>`
- Get summary: `GET /admin/recordings/:id/summary?site=<site_oid>`
- Note: Admin-only (JWT role).

## Errors and Validation

- 400: invalid/missing fields (e.g., local_date format, invalid ObjectId)
- 401: missing/invalid JWT
- 403: forbidden (role/access)
- 404: not found
- 500: internal error
- Error shape: `{ error: string }`

## Minimal FE Migration Steps

- Auth
  - Switch /login → `/auth/signin`; /signup → `/auth/signup`.
  - Remove `/refresh` usage.
  - Use new forgot/reset flows if needed.
- Sites
  - Store both `site_id` (business id) and `_id` (ObjectId). Use `_id` in API calls.
- Recordings
  - Upload: use `/recording/upload` (multipart); provide `file`, `job_id`, `local_date`.
  - List: `/recording/day-logs?job_id=<site_oid>`.
  - Detail: `/recording/day/:id` (streaming URLs included).
  - Summary + images: `/recording/day/:id/summary`.
  - Delete: `/recording/day/:id`.
- Images
  - Upload: `/images/upload` with `job_id` + `day_id`.
  - Delete: `/images/:id` (owner or admin).
- Email
  - `/recording/email-day-recording` with `day_id` + `pdf`.
- Search
  - `/recording/search` with `job_id` + `query`.
- Progress
  - `/progress?site=<site_oid>` (or omit `site` to use “today’s most recent” across sites).
- Health
  - `/health` for connectivity checks.
