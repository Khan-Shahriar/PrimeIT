# PrimeIt — Section 39 Final QA & Production Sign-off

## Purpose

This section is the final verification phase. It does not redesign or rebuild PrimeIt. It verifies the integrated platform end-to-end and records production sign-off only after local automated checks, database migrations, API behavior, browser regression, and security checks pass.

## Automated verification

Run from the project root:

```powershell
git pull origin main
npm install
npm run check
npm run security:check
npm run test:frontend
npm run test:health
npm run test:auth
npm run test:rbac
```

Then start the server:

```powershell
npm start
```

## Database verification

Confirm the additive migrations required by the current system have been applied, especially:

- `sql/section-30-gallery.sql`
- `sql/section-33-announcements.sql`
- `sql/section-34-leave.sql`
- `sql/section-35-holidays.sql`
- `sql/section-38-office-contact.sql`

Do not delete or rebuild existing production data.

## Browser regression checklist

### Public website

- [ ] Home loads without console errors.
- [ ] About loads without console errors.
- [ ] Team loads without console errors.
- [ ] Gallery loads published gallery content.
- [ ] Contact page loads without console errors.
- [ ] Contact form rejects invalid input client-side.
- [ ] Valid contact form creates a database inquiry.
- [ ] Contact form shows API/server errors correctly.
- [ ] Contact submission cannot be spammed beyond the configured rate limit.
- [ ] Public navigation and responsive menu work.

### Authentication

- [ ] Member login succeeds with a valid account.
- [ ] Invalid member login is rejected.
- [ ] Admin login succeeds with a valid account.
- [ ] Invalid admin login is rejected.
- [ ] Logout invalidates the authenticated session.
- [ ] Protected pages redirect/reject unauthenticated users.
- [ ] JWT is not stored in localStorage/sessionStorage.

### Member panel

- [ ] Dashboard loads authoritative API data.
- [ ] Members page loads live members.
- [ ] Announcements loads published announcements.
- [ ] Office Information loads live backend data.
- [ ] Leave Management loads balances, requests, and holidays.
- [ ] Gallery loads published gallery content.
- [ ] My Profile loads and updates correctly.

### Admin panel

- [ ] Dashboard loads available metrics.
- [ ] Member Management list/create/update/activate/deactivate work.
- [ ] Leave Management list/approve/reject/cancel behavior is correct.
- [ ] Holiday Management list/create/update/delete works.
- [ ] Announcements list/create/update/publish/unpublish/archive works.
- [ ] Office Information list/create/update/archive/restore works.
- [ ] Gallery management/upload/publish/archive works.
- [ ] Role & Permission Management respects CEO/Developer authority.
- [ ] Admin Profile works.

### RBAC regression

Test at minimum:

- [ ] CEO has full access.
- [ ] Developer has full access and role-management authority.
- [ ] Restricted Admin cannot access unassigned permissions.
- [ ] Restricted HR cannot access unassigned permissions.
- [ ] Self-promotion is blocked.
- [ ] Final CEO protection remains enforced.
- [ ] Multiple assigned roles combine permissions correctly.
- [ ] Direct API calls cannot bypass server-side authorization.

### API / browser console

- [ ] No unexpected 401/403/404/500 responses.
- [ ] No unexpected JavaScript exceptions.
- [ ] No failed static assets.
- [ ] No mixed-content requests.
- [ ] API requests use `/api/v1`.
- [ ] Mutations update the UI only after server confirmation.
- [ ] Refreshing a page preserves server-authoritative state.

## Production sign-off criteria

Production sign-off is allowed only when:

1. Automated checks pass.
2. Required migrations are applied successfully.
3. Browser regression passes.
4. No blocking console/network errors remain.
5. Authentication and RBAC regression passes.
6. Contact submission has been verified end-to-end.
7. Office Information has been verified end-to-end.
8. Gallery upload/storage behavior has been verified.
9. No known critical or high-severity blocker remains.

Until every required item is checked, PrimeIt remains **QA Pending**, not production-signed-off.
