# SECTION 29 — REST API Integration

## Scope

Section 29 connects the existing Vanilla JavaScript frontend to backend functionality that is actually implemented in Sections 27 and 28. It does not invent contracts for deferred domains and does not implement the Section 30 gallery upload system.

## Canonical API

- Frontend API base: `/api/v1`
- Authentication: JWT in HTTP-only cookie
- Frontend must never read or store the JWT
- Backend authentication and RBAC remain the security boundary

## Shared client

`js/api.js` centralizes:

- base URL
- credentialed requests
- JSON/FormData handling
- response parsing
- timeout/cancellation
- normalized API errors
- 401/403/404/409/422/429/5xx handling
- network failures

## Confirmed integrated endpoints

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PUT /api/v1/auth/me`
- `POST /api/v1/auth/me/photo`
- `PUT /api/v1/auth/me/password`

### Members

- `GET /api/v1/members`
- `GET /api/v1/members/:id`
- `POST /api/v1/members`
- `PUT /api/v1/members/:id`
- `DELETE /api/v1/members/:id`

### RBAC

- `GET /api/v1/roles`
- `GET /api/v1/roles/permissions`
- `GET /api/v1/roles/:id`
- `GET /api/v1/roles/:id/permissions`
- `GET /api/v1/roles/:id/members`
- `POST /api/v1/roles`
- `PATCH /api/v1/roles/:id`
- `PUT /api/v1/roles/:id/permissions`
- `DELETE /api/v1/roles/:id`
- `GET /api/v1/users/:userId/roles`
- `PUT /api/v1/users/:userId/roles`

## Intentionally deferred

The audited Section 28 backend does not yet expose the complete REST contracts for:

- leave management
- holiday management
- announcements
- office information
- gallery management/public gallery
- contact submission

Those frontend sections retain neutral loading/unavailable states rather than fabricated production data.

## Security rules

- No JWT in localStorage/sessionStorage/document.cookie.
- No client-only authorization.
- 401 is treated as an authentication/session problem.
- 403 is treated as an authorization problem.
- Server response is the source of truth after mutations.
- Untrusted API content is rendered with safe DOM APIs/textContent.
- Destructive requests are not automatically retried.
- Sensitive backend errors are not surfaced verbatim.

## Verification

Windows:

```powershell
npm run check
npm run test:frontend
npm run test:health
npm run test:auth
npm run test:rbac
npm run test:all
curl.exe -i http://localhost:8080/api/v1/health
```

Browser DevTools should be used to verify request URL, method, status, payload, response, cookies, timing, console errors, and responsive behavior. Do not expose authentication cookies or tokens in screenshots/logs.

## Section 30 handoff

Section 29 deliberately does not build the gallery upload/storage architecture. Existing profile-photo upload remains the already-established Section 27 account-photo endpoint and is separate from the Section 30 gallery media system.
