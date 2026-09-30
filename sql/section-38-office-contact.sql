-- PrimeIt Section 38: Office Information + Contact API
-- Additive, idempotent MySQL 8.0 migration.

CREATE TABLE IF NOT EXISTS office_information (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    record_type ENUM('office','hours','department','contact','policy','resource') NOT NULL,
    title VARCHAR(160) NULL,
    status ENUM('active','archived','published','draft') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    data JSON NOT NULL,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_office_type_status (record_type, status),
    KEY idx_office_sort (record_type, sort_order),
    CONSTRAINT fk_office_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_office_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_inquiries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    company VARCHAR(150) NULL,
    inquiry_type VARCHAR(40) NOT NULL DEFAULT 'general',
    subject VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new','in_progress','resolved','spam','archived') NOT NULL DEFAULT 'new',
    reviewed_by INT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contact_status_created (status, created_at),
    KEY idx_contact_email (email),
    CONSTRAINT fk_contact_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions (name, description, module, action, status) SELECT 'office_information.view','View office information','office_information','view','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='office_information.view');
INSERT INTO permissions (name, description, module, action, status) SELECT 'office_information.create','Create office information records','office_information','create','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='office_information.create');
INSERT INTO permissions (name, description, module, action, status) SELECT 'office_information.update','Update office information records','office_information','update','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='office_information.update');
INSERT INTO permissions (name, description, module, action, status) SELECT 'office_information.delete','Archive office information records','office_information','delete','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='office_information.delete');
INSERT INTO permissions (name, description, module, action, status) SELECT 'contact_inquiries.view','View contact inquiries','contact_inquiries','view','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='contact_inquiries.view');
INSERT INTO permissions (name, description, module, action, status) SELECT 'contact_inquiries.update','Update contact inquiry status','contact_inquiries','update','active' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='contact_inquiries.update');
