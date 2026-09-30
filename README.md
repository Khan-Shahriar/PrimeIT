# PrimeIt

PrimeIt is a professional IT company public website and internal office management platform.

## Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express.js
- Database: MySQL
- Authentication: JWT + HTTP-only cookies
- API: REST API

## Backend

The canonical API namespace is `/api/v1`.

Health endpoint:

`GET /api/v1/health`

The existing `/api/*` endpoints are retained as compatibility aliases while the frontend is migrated to the versioned API.

## Local development

1. Copy `.env.example` to `.env`.
2. Configure MySQL and authentication/email environment variables.
3. Install dependencies: `npm install`
4. Run syntax checks: `npm run check`
5. Start the server: `npm run dev`
6. Verify the API: `npm run test:health`
7. Run the security static audit: `npm run security:check`

## Backend structure

```text
server/
├── app.js
├── server.js
├── db.js
├── config/
│   └── env.js
├── controllers/
│   └── systemController.js
├── middleware/
│   ├── asyncHandler.js
│   ├── auth.js
│   ├── errorHandler.js
│   ├── notFound.js
│   ├── profileUpload.js
│   └── requestLogger.js
├── routes/
│   ├── index.js
│   ├── system.js
│   ├── auth.js
│   ├── members.js
│   ├── roles.js
│   └── test.js
├── sql/
├── utils/
└── set-ceo.js
```

Private configuration stays in `.env`; it is ignored by Git. Never commit credentials, JWT secrets, database passwords, API keys, or private uploaded files.

## Section 30 — Gallery Uploads

Gallery media is stored outside application source files under `uploads/gallery/` by default. The API accepts only JPEG, PNG, and WebP images, with a 10 MB request-file limit and server-side content/dimension validation.

Run the additive migration before using gallery management:

`sql/section-30-gallery.sql`

Gallery API endpoints use the canonical `/api/v1/gallery` namespace. Gallery management is protected by the existing Section 28 permissions: `gallery.view`, `gallery.create`, `gallery.update`, `gallery.publish`, and `gallery.archive`.

Uploaded media is intentionally excluded from Git. Do not commit files from `uploads/gallery/`.


## Section 34 — Leave Management Backend

Leave management now has a transactional backend for member leave requests, yearly balances, cancellation, and administrator approval/rejection.

Run the additive migration before using leave management:

`sql/section-34-leave.sql`

Canonical endpoints:

- `GET /api/v1/leave`
- `GET /api/v1/leave/balance`
- `POST /api/v1/leave`
- `POST /api/v1/leave/:id/cancel`
- `GET /api/v1/leave/admin`
- `POST /api/v1/leave/:id/approve`
- `POST /api/v1/leave/:id/reject`

Leave authorization uses the existing granular permissions: `leave.view`, `leave.create`, `leave.cancel`, `leave.approve`, and `leave.reject`.

## Security

Section 31 security hardening covers authentication/session invalidation, cookie and CSRF defenses, RBAC/privilege controls, request and API rate limits, upload/path validation, static-file protection, safe logging/errors, dependency checks, and automated security checks. See `SECURITY.md` for the production security checklist.
