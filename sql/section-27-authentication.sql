-- PrimeIt Section 27 authentication migration.
-- Run once against the existing MySQL database.
-- Existing accounts default to verified so current users are not locked out.
-- Public signup explicitly creates unverified accounts.

ALTER TABLE users
    ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER status,
    ADD COLUMN email_verification_token_hash CHAR(64) NULL AFTER email_verified,
    ADD COLUMN email_verification_expires_at DATETIME NULL AFTER email_verification_token_hash,
    ADD COLUMN auth_token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER email_verification_expires_at;

CREATE INDEX idx_users_email_verification_token
    ON users (email_verification_token_hash);

CREATE INDEX idx_users_status_email
    ON users (status, email);
