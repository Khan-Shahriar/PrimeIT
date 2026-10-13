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


## Section 35 — Holiday Management Backend

Holiday management now has a protected REST API for listing, viewing, creating, updating, and deleting holidays.

Run the additive migration before using holiday management:

`sql/section-35-holidays.sql`

Canonical endpoints:

- `GET /api/v1/holidays`
- `GET /api/v1/holidays/:id`
- `POST /api/v1/holidays`
- `PATCH /api/v1/holidays/:id`
- `DELETE /api/v1/holidays/:id`

Holiday authorization uses the existing granular permissions:

- `holiday.create`
- `holiday.update`
- `holiday.delete`

Holiday calendar reads (`GET /api/v1/holidays` and `GET /api/v1/holidays/:id`) require authentication; write operations remain protected by the granular holiday permissions.

The migration includes the established 2026 holiday baseline and is additive/idempotent for the holiday records it creates.


## Section 36 — Leave & Holiday Calendar Integration

Leave Management now consumes the authoritative Holiday Management API for the member and administrator calendar views. Static holiday data has been removed from those views. Active holidays are loaded for the current calendar year through authenticated calendar reads, while creating, updating, and deleting holidays remains restricted to the existing holiday permissions. Leave balance and leave-request calculations remain server-authoritative and are not silently changed by the calendar display integration.


## Section 37 — Dashboard API Integration

Member and administrator dashboards now consume the existing authenticated REST APIs instead of relying on placeholder dashboard data. Member dashboard data includes the authenticated member's leave balances, published announcements, and active company holidays. Administrator dashboard metrics consume the existing member, leave, announcement, gallery, and holiday endpoints. Each dashboard uses independent API requests so an unavailable optional data source does not fabricate or replace data from the other sources.


## Section 9 — Member Management Integration

The Member Management frontend now uses the authenticated `/api/v1/members` REST API for live member records. Create, update, activate, and deactivate operations remain server-authoritative and permission-protected. The frontend preserves the existing UI and does not fabricate production member data when the API is unavailable.


## Section 38 — Office Information + Contact API

Office Information now has an authenticated REST backend backed by MySQL, with typed records for office details, working hours, departments, important contacts, policies, and resources. Member reads use `GET /api/v1/office-information`; administrator management uses `GET /api/v1/office-information/admin` plus protected create/update/archive operations. The existing member and administrator Office Information pages now consume the API without replacing their UI.

The public Contact form now submits validated inquiries to `POST /api/v1/contact`. Contact inquiries are stored in MySQL, protected by a public submission rate limit, and can be reviewed/updated through protected administrator API endpoints using `contact_inquiries.view` and `contact_inquiries.update` permissions. Run `sql/section-38-office-contact.sql` before using these features.


## Section 39 — Final QA & Production Sign-off

PrimeIt is now in final QA rather than feature development. The full regression checklist is documented in `docs/SECTION-39-FINAL-QA.md`. Automated syntax, security, frontend, health, authentication, and RBAC checks must pass before browser regression. Production sign-off remains pending until the browser checklist and end-to-end verification are completed successfully.

## Browser Favicon

The PrimeIt browser-tab icon is defined in `public/favicon.svg` and uses the existing letter-P mark. Public pages reference it as `favicon.svg`; admin and member pages reference it as `../public/favicon.svg`.

## Member Management Filter Dropdowns

The Department, Role, and Status filters use matching custom dropdown menus with rounded corners, soft shadows, blue hover/selected states, and keyboard navigation. The original select controls remain the source of selected values, so existing filtering behavior is preserved.

## Leave Management Review Queue UI

The administrator Leave Management review queue follows the Member Management Directory card pattern: a unified section header, search and filter toolbar, matching 42px filter controls with rounded borders and consistent hover/focus shadows, consistent table header and row typography, aligned action buttons, and responsive filter layout. Existing leave API integration, filter controls, pagination, and approval/rejection actions are preserved.

The Leave Status select now matches the Member Management Department dropdown trigger with a custom chevron, rounded 42px control, and matching blue hover/focus styling; native select behavior is preserved.

The Leave Status filter now uses the same rounded custom dropdown menu as the Member Management Department filter, including a 12px menu radius, soft shadow, blue hover/selected states, and keyboard navigation. The native select remains the filtering source of truth.


Leave Type and Department now use the same rounded custom dropdown menus as Leave Status and the Member Management filters, including soft shadows, blue hover/selected states, and keyboard navigation. Department options refresh from loaded leave-request data. From date and To date controls use matching rounded borders and hover/focus shadows; the calendar popup itself remains browser-native.

## Shared Rounded Dropdown Design

All 45 native HTML `<select>` controls across the 12 pages that contain dropdowns now follow the PrimeIt custom dropdown standard. The shared `css/custom-dropdowns.css` and `js/custom-dropdowns.js` assets provide a rounded trigger button using the `department-dropdown-trigger` visual pattern, a curved 12px menu, soft shadows, blue hover and selected states, and keyboard support (Arrow keys, Home/End, Enter/Space, and Escape). The native select remains the form/filter value source so existing page behavior and form submission are preserved. The enhancer updates when options change dynamically and leaves the existing Member Management and Leave Management custom filter dropdowns intact, while also styling their remaining form selects.

Pages covered: Admin Announcements, Gallery, Office Information, Holiday Management, Leave Management, Member Management, Role & Permissions; Member Announcements, Leave Management, Gallery, Members; and Public Contact. Browser-native date pickers and other non-select controls are not changed.

The Leave Management search input has a subtle lift-and-shadow hover animation. Its focused state removes the blue rounded focus halo while retaining a restrained border and shadow change; reduced-motion preferences are respected.

## Shared Search Input Design

All 17 HTML `input[type="search"]` fields across 13 admin and member pages now use the shared `css/search-inputs.css` design aligned with Admin Leave Management's `#leave-search`: consistent 42px height, 10px rounded corners, subtle default shadow, blue-tinted border and lift/shadow hover animation, and a solid blue focus border without a blue focus halo. Existing search IDs, names, placeholders, icon padding, filtering logic, and responsive layouts are preserved. Reduced-motion preferences are respected.
