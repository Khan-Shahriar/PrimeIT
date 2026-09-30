-- PrimeIt Section 34: Leave Management
-- Additive/idempotent schema migration. Does not modify existing authentication/RBAC tables.

CREATE TABLE IF NOT EXISTS leave_balances (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    leave_type ENUM('holiday','casual','sick') NOT NULL,
    year SMALLINT UNSIGNED NOT NULL,
    allowance DECIMAL(5,2) NOT NULL DEFAULT 6.00,
    adjustment DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_leave_balance_user_type_year (user_id, leave_type, year),
    KEY idx_leave_balance_user_year (user_id, year),
    CONSTRAINT fk_leave_balance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    leave_type ENUM('holiday','casual','sick') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(5,2) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    reviewed_by INT UNSIGNED NULL,
    reviewer_comment VARCHAR(1000) NULL,
    cancelled_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_leave_request_user_status (user_id, status),
    KEY idx_leave_request_dates (start_date, end_date),
    KEY idx_leave_request_status_submitted (status, submitted_at),
    KEY idx_leave_request_reviewed_by (reviewed_by),
    CONSTRAINT fk_leave_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_request_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill the standard 6-day allowance for existing active users for the current year.
INSERT IGNORE INTO leave_balances (user_id, leave_type, year)
SELECT u.id, types.leave_type, YEAR(CURDATE())
FROM users u
CROSS JOIN (
    SELECT 'holiday' AS leave_type
    UNION ALL SELECT 'casual'
    UNION ALL SELECT 'sick'
) types
WHERE u.status = 'active';
