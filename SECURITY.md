# PrimeIt Security Guide

## Scope

PrimeIt is a Node.js/Express + MySQL application using JWT access tokens stored in HTTP-only cookies.

Security controls are enforced server-side. Frontend state, hidden fields, URL parameters, local storage, and client-side role variables are never treated as authorization evidence.

## Authentication

- JWTs use HS256 with configured issuer and audience.
- Access tokens contain a token version and are checked against the current database value.
- Logout increments the user's token version and clears the cookie.
- Password changes and password resets invalidate existing access tokens.
- Passwords use bcrypt with a configurable cost constrained to 10–15.
- Password reset and email verification tokens are opaque random values stored only as SHA-256 hashes.
- Authentication, password recovery, and verification endpoints are rate limited.

## Cookies and CSRF

The authentication cookie is HTTP-only and explicitly configured with SameSite and Secure behavior. Production always enables Secure.

State-changing requests carrying the authentication cookie are checked against the configured client Origin or Referer. SameSite remains a defense-in-depth control.

Do not configure a broad cookie Domain unless subdomain sharing is explicitly required.

## Authorization

Authorization is evaluated from the authenticated user and database-backed roles/permissions on every protected request.

CEO and Developer are the protected full-access roles. Other roles receive only assigned permissions.

Protected role assignment and modification require authorization-management access, and protected roles cannot be self-promoted.

## Input and database security

- JSON and URL-encoded bodies have a bounded size.
- Request targets have a bounded length.
- API requests are rate limited.
- Dynamic SQL identifiers are not taken directly from user input.
- Query values use parameterized MySQL statements.
- IDs, role names, statuses, metadata, and arrays are validated server-side.
- Database updates use explicit field allowlists.

## File uploads

Gallery and profile uploads use in-memory Multer storage, strict file-count/size/part limits, MIME checks, image-signature validation, dimension/pixel limits, generated filenames, and confined filesystem paths.

Original client filenames are metadata only and are never used as storage paths.

## Static files

Sensitive dotfiles, environment files, server source files, package manifests, and raw gallery storage paths are denied by the application before static-file handling.

## Logging and errors

Logs do not include query strings, cookies, passwords, reset tokens, or raw request bodies. Server errors return generic messages while internal logs use non-sensitive diagnostic fields.

## Production checklist

Before production:

1. Set NODE_ENV=production.
2. Set a strong random JWT_SECRET of at least 32 characters; use substantially more entropy in practice.
3. Configure CLIENT_ORIGIN to the exact trusted origin.
4. Use HTTPS.
5. Keep COOKIE_SECURE=true.
6. Prefer COOKIE_SAME_SITE=strict when the deployment allows it; otherwise use the minimum cross-site behavior required by the application.
7. Do not set COOKIE_DOMAIN unless necessary.
8. Configure database credentials only through environment/secret management.
9. Keep uploads/ outside Git.
10. Run npm run check, npm run security:check, and the application smoke tests.
11. Run npm audit against the exact lockfile used for deployment.
12. Test authentication, RBAC, IDOR, CSRF, uploads, rate limits, logout, and error handling in a staging environment.

## Security testing

Security testing must use a local/staging PrimeIt instance or an explicitly authorized environment. Never test production or third-party systems with attack traffic.
