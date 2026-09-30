-- PrimeIt Section 33: Announcements
-- Additive, idempotent MySQL 8.0-compatible migration.
-- Canonical status contract: Draft, Published, Archived.

CREATE TABLE IF NOT EXISTS announcements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NULL,
    content TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'General',
    audience VARCHAR(80) NOT NULL DEFAULT 'All Members',
    status ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Draft',
    author_id INT UNSIGNED NULL,
    published_at DATETIME NULL,
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    is_important TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_announcements_status_published (status, published_at),
    KEY idx_announcements_category (category),
    KEY idx_announcements_pinned (is_pinned),
    KEY idx_announcements_author (author_id),
    CONSTRAINT fk_announcements_author
        FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
