CREATE TABLE IF NOT EXISTS holidays (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    holiday_date DATE NOT NULL,
    description VARCHAR(500) NULL,
    holiday_type ENUM('Public Holiday','Company Holiday','Optional Holiday','Other') NOT NULL DEFAULT 'Public Holiday',
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_holidays_date (holiday_date),
    KEY idx_holidays_status_date (status, holiday_date),
    KEY idx_holidays_type_date (holiday_type, holiday_date),
    KEY idx_holidays_created_by (created_by),
    CONSTRAINT fk_holidays_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'New Year', '2026-01-01', 'New Year holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-01-01' AND name='New Year');

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'Memorial Day', '2026-05-25', 'Memorial Day holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-05-25' AND name='Memorial Day');

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'Independence Day', '2026-07-04', 'Independence Day holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-07-04' AND name='Independence Day');

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'Labor Day', '2026-09-07', 'Labor Day holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-09-07' AND name='Labor Day');

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'Thanksgiving', '2026-11-26', 'Thanksgiving holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-11-26' AND name='Thanksgiving');

INSERT INTO holidays (name, holiday_date, description, holiday_type, recurring, status)
SELECT 'Christmas', '2026-12-25', 'Christmas holiday', 'Public Holiday', FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date='2026-12-25' AND name='Christmas');

