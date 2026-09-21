-- PrimeIt Section 30 Gallery migration.
-- Run against the existing Section 25-29 database.
-- This migration is additive and does not delete existing data.

CREATE TABLE IF NOT EXISTS gallery_media (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(2000) NULL,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(250) NOT NULL,
    category VARCHAR(80) NULL,
    collection_name VARCHAR(120) NULL,
    status ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Draft',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    original_filename VARCHAR(255) NULL,
    stored_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    width INT UNSIGNED NOT NULL,
    height INT UNSIGNED NOT NULL,
    published_at DATETIME NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by INT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_gallery_status (status),
    KEY idx_gallery_featured_status (is_featured, status),
    KEY idx_gallery_category (category),
    KEY idx_gallery_collection (collection_name),
    KEY idx_gallery_uploaded_at (uploaded_at),
    KEY idx_gallery_uploaded_by (uploaded_by),
    CONSTRAINT fk_gallery_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description)
SELECT 'manage_gallery', 'Create, update, publish, feature, archive, and delete gallery media.'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'manage_gallery'
);
