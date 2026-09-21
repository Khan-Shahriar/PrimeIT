# PrimeIt Section 27 — Authentication Security

## Authentication boundary

Section 27 establishes authenticated identity. Permission enforcement remains in the existing authorization layer and is not expanded here.

## JWT

- HTTP-only cookie only.
- HS256 with a server-side JWT secret.
- Configurable expiration through JWT_EXPIRES_IN.
- Claims are limited to subject, token type, token version, issued/expiry metadata, issuer, audience and a random JWT ID.
- No password, password hash, permission list or sensitive profile data is stored in the JWT.
- auth_token_version invalidates existing tokens after password changes/resets.

## Cookie

primeit_token is HTTP-only. Secure is enabled in production, SameSite defaults to Lax, path is centralized, and persistent Max-Age is controlled by configuration.

## Passwords

Passwords are hashed with bcryptjs using BCRYPT_ROUNDS (10-15, default 12). Passwords and password hashes are never returned by authentication responses.

## Password reset

Reset identifiers are 32 random bytes, stored only as SHA-256 hashes, expire after 15 minutes, are single-use, and return a generic forgot-password response.

## Email verification

Verification identifiers are 32 random bytes, stored only as SHA-256 hashes, expire after 30 minutes, and are cleared after successful verification. Existing accounts are migrated as verified; new public accounts are unverified. REQUIRE_EMAIL_VERIFICATION=true enables login enforcement.

## CSRF and CORS

Credentialed CORS requires an explicit CLIENT_ORIGIN. SameSite=Lax provides an additional browser-level CSRF defense. If production deployment requires SameSite=None or another cross-site cookie architecture, add a server-side CSRF token mechanism before deployment.

## Logout and revocation

Logout clears the authentication cookie. Password changes and password resets increment auth_token_version, invalidating previously issued JWTs. A stolen JWT is still valid until expiration unless token-version invalidation is triggered, so JWT_EXPIRES_IN remains bounded.

## Production requirements

Use HTTPS, Secure cookies, an explicit CORS origin, strong server-side secrets, a production email provider, and a controlled APP_BASE_URL.
