### Share Extension Capture Plan (Single Image, Headless, Convex)

#### Objectives

- Single image only; no deep links; instant handoff to the backend.
- Match existing client optimization: width 640, WEBP, quality 0.5, base64.
- Extension shows minimal UI (spinner → sent/failed), then dismisses.
- Server does AI extraction and sends a push when done.

#### End-to-end flow

1. User shares an image to the extension.
2. Extension loads the first image only, resizes to width 640, encodes as WEBP (quality 0.5), base64-encodes the bytes.
3. Extension POSTs JSON to Convex `POST /share/v1/capture` with `X-Share-Token` header and immediately dismisses after a 2xx “accepted” response.
4. Backend calls `ai.eventFromImageBase64Direct` to schedule processing and push notification.

---

### Encoding and size (match existing app behavior)

- Match `apps/expo/src/hooks/useCreateEvent.ts` `optimizeImage`:
  - width: 640 px (height computed by aspect ratio)
  - format: WEBP
  - quality: 0.5
  - base64 output in request payload

Notes on iOS encoding:

- Prefer encoding WEBP via `CGImageDestination` with `UTType.webP` when supported.
- If WEBP encoding is not available at runtime, fallback to JPEG (quality 0.5) and include a `format` hint so the server accepts and uploads it. The backend uploader should accept WEBP and JPEG; if needed, transcode to WEBP server-side.

---

### Share extension (Swift) behavior

- Single image only. Ignore additional attachments.
- UI: non-interactive, minimal.
  - Show: "Capturing…" with spinner.
  - On 2xx: show "Sent!" briefly, then dismiss.
  - On error: show "Failed to send" with a Close button (or auto-dismiss after a short delay).
- Auth: read a separate share token from App Group `UserDefaults(suiteName: group.com.soonlist[.dev])`.
- Network: synchronous POST while the extension is visible; background transfers aren’t available for share extensions.

Payload (single image):

```json
{
  "kind": "image",
  "base64Image": "<base64 of image/webp>",
  "format": "image/webp",
  "timezone": "America/Los_Angeles",
  "comment": null,
  "lists": [],
  "visibility": "private"
}
```

Headers:

- `Content-Type: application/json`
- `X-Share-Token: <token>`

Response (example):

```json
{ "ok": true, "jobId": "<id>" }
```

Dismiss the extension after any 2xx response (the server will continue processing and push a notification upon completion).

Pseudocode for resizing and WEBP encode:

```swift
// 1) Load first UIImage from NSItemProvider
// 2) Resize to width=640, preserve aspect ratio
// 3) Encode WEBP (quality 0.5) using CGImageDestination + UTType.webP
//    Fallback to JPEG if WEBP unavailable
// 4) Base64-encode and POST JSON
```

---

### Backend (Convex)

- Add `convex/http.ts` route using `httpAction`:

  - `POST /share/v1/capture`
  - Validates `X-Share-Token` → resolves `userId`/`username`.
  - For `kind === "image"`:
    - Calls `ai.eventFromImageBase64Direct` with provided `base64Image`, `timezone`, defaults for `comment`, `lists`, `visibility`, and `sendNotification: true`.
  - Returns `{ ok: true, jobId }`.

- Share token helpers:

  - Table: `shareTokens` with fields: `token`, `userId`, `username`, `createdAt`, `revokedAt?`.
  - Mutation: `shareTokens.createShareToken({ userId })` → random token, associates `username`.
  - Internal query: `shareTokens.resolveShareToken({ token })` → `{ userId, username } | null`.
  - Optional TTL/rotation and logout revocation.

- Accepting formats:

  - The endpoint accepts `format` hint (`image/webp` or `image/jpeg`).
  - `internal.files.uploadImage` should accept both; if not, transcode to WEBP server-side in the action before upload.

- Processing path (existing):
  - `ai.eventFromImageBase64Direct` → schedules `ai.processSingleImageWithNotification`.
  - `ai.processSingleImage` runs `extractEventFromBase64Image` and `files.uploadImage` in parallel, validates and inserts event, then optionally sends a push notification.

---

### Main app (Expo) integration

- On login/sign-in success:

  - Call Convex mutation `shareTokens.createShareToken` to get a token bound to the user.
  - Persist in App Group under stable keys: `shareToken`, `userId`, `username`, `timezone`.
  - Keep updated on auth changes and timezone changes.

- Configuration for the extension:
  - Provide base API URL (Convex deployment) via extension `Info.plist` key, e.g., `ConvexHttpBaseURL`.
  - Use dev/prod switching via bundleIdentifier suffix (`.dev.share`).

---

### Rationale: separate share token

- Least privilege: limits the extension to capture-only.
- Easy revocation/rotation without touching app session.
- Simpler than bringing full app auth into an extension.

---

### Error handling & UX

- Missing token or network error → show failure and dismiss quickly.
- WEBP encode failure → fallback to JPEG 0.5; include `format` in payload.
- AI takes several seconds → user does not wait; they receive a push on completion.

---

### Testing checklist

- Dev build: verify POST to `/share/v1/capture` with WebP @ 640/0.5, receive `{ ok: true, jobId }`.
- Backend logs show `eventFromImageBase64Direct` scheduled; event created; image uploaded.
- Verify push notification arrives with event link.
- Revoke token → POST returns 401. Create new token → POST succeeds.
- Fallback path: force WEBP unsupported → JPEG path still accepted and uploaded.

---

### Acceptance criteria

- Share extension sends a single image as base64 WebP (640 width, q=0.5) and dismisses on 2xx (falls back to JPEG 0.5 if WebP unsupported).
- Backend endpoint authenticates via share token and returns `{ ok: true, jobId }`.
- Event is created and image uploaded; user receives a push notification.
- No deep links used; works on iOS 16–18 (iOS 26 typo) without foregrounding the app.
