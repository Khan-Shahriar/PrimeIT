-- PrimeIt Section 28: Authorization + RBAC
-- Additive and MySQL 8.0-compatible migration.
-- Keeps existing Section 25 roles/permissions and migrates them to the canonical RBAC catalog.
-- Server authorization uses user_roles -> roles -> role_permissions -> permissions.

CREATE TABLE IF NOT EXISTS roles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255) NULL,
    type ENUM('system','custom') NOT NULL DEFAULT 'custom',
    status ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

-- MySQL 8.0 does not support ADD COLUMN IF NOT EXISTS.
-- Add missing columns conditionally through prepared ALTER statements.

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'roles' AND column_name = 'type'
    ),
    'SELECT 1',
    'ALTER TABLE roles ADD COLUMN type ENUM(''system'',''custom'') NOT NULL DEFAULT ''custom'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'roles' AND column_name = 'status'
    ),
    'SELECT 1',
    'ALTER TABLE roles ADD COLUMN status ENUM(''active'',''inactive'',''archived'') NOT NULL DEFAULT ''active'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'roles' AND column_name = 'is_system'
    ),
    'SELECT 1',
    'ALTER TABLE roles ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'roles' AND column_name = 'updated_at'
    ),
    'SELECT 1',
    'ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS permissions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    module VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'permissions' AND column_name = 'module'
    ),
    'SELECT 1',
    'ALTER TABLE permissions ADD COLUMN module VARCHAR(80) NOT NULL DEFAULT ''other'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'permissions' AND column_name = 'action'
    ),
    'SELECT 1',
    'ALTER TABLE permissions ADD COLUMN action VARCHAR(80) NOT NULL DEFAULT ''view'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'permissions' AND column_name = 'status'
    ),
    'SELECT 1',
    'ALTER TABLE permissions ADD COLUMN status ENUM(''active'',''inactive'') NOT NULL DEFAULT ''active'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'permissions' AND column_name = 'updated_at'
    ),
    'SELECT 1',
    'ALTER TABLE permissions ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Section 28 permits permission names up to 120 characters.
ALTER TABLE permissions MODIFY COLUMN name VARCHAR(120) NOT NULL;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

SET @sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'role_permissions' AND column_name = 'created_at'
    ),
    'SELECT 1',
    'ALTER TABLE role_permissions ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Normalize system/custom role metadata without overwriting custom role lifecycle status.
UPDATE roles
SET
    type = CASE
        WHEN LOWER(name) IN ('ceo', 'developer', 'admin', 'hr', 'member') THEN 'system'
        ELSE 'custom'
    END,
    is_system = CASE
        WHEN LOWER(name) IN ('ceo', 'developer', 'admin', 'hr', 'member') THEN 1
        ELSE 0
    END;

UPDATE roles
SET
    description = CASE LOWER(name)
        WHEN 'ceo' THEN 'PrimeIt Chief Executive Officer'
        WHEN 'developer' THEN 'PrimeIt Developer with authorization-management access'
        WHEN 'admin' THEN 'PrimeIt Admin; permissions are explicitly assigned'
        WHEN 'hr' THEN 'PrimeIt HR; permissions are explicitly assigned'
        WHEN 'member' THEN 'PrimeIt Member; self-service permissions are explicitly assigned'
        ELSE description
    END,
    status = 'active'
WHERE LOWER(name) IN ('ceo', 'developer', 'admin', 'hr', 'member');

INSERT INTO roles (name, description, type, status, is_system)
VALUES
('ceo','PrimeIt Chief Executive Officer','system','active',1),
('developer','PrimeIt Developer with authorization-management access','system','active',1),
('admin','PrimeIt Admin; permissions are explicitly assigned','system','active',1),
('hr','PrimeIt HR; permissions are explicitly assigned','system','active',1),
('member','PrimeIt Member; self-service permissions are explicitly assigned','system','active',1)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    type = VALUES(type),
    status = 'active',
    is_system = VALUES(is_system);

-- Canonical Section 28 permission catalog.
INSERT INTO permissions (name, description, module, action, status)
VALUES
('dashboard.view','View the management dashboard','dashboard','view','active'),
('members.view','View member records','members','view','active'),
('members.create','Create members','members','create','active'),
('members.update','Update member records','members','update','active'),
('members.deactivate','Deactivate members','members','deactivate','active'),
('members.archive','Archive members','members','archive','active'),
('leave.view','View leave records','leave','view','active'),
('leave.create','Submit leave requests','leave','create','active'),
('leave.update','Update eligible leave requests','leave','update','active'),
('leave.cancel','Cancel eligible own leave requests','leave','cancel','active'),
('leave.approve','Approve leave requests','leave','approve','active'),
('leave.reject','Reject leave requests','leave','reject','active'),
('holidays.view','View holidays','holidays','view','active'),
('holidays.create','Create holidays','holidays','create','active'),
('holidays.update','Update holidays','holidays','update','active'),
('holidays.delete','Delete holidays','holidays','delete','active'),
('announcements.view','View announcements','announcements','view','active'),
('announcements.create','Create announcements','announcements','create','active'),
('announcements.update','Update announcements','announcements','update','active'),
('announcements.publish','Publish announcements','announcements','publish','active'),
('announcements.unpublish','Unpublish announcements','announcements','unpublish','active'),
('announcements.delete','Delete announcements','announcements','delete','active'),
('office_information.view','View office information','office_information','view','active'),
('office_information.create','Create office information','office_information','create','active'),
('office_information.update','Update office information','office_information','update','active'),
('gallery.view','View gallery','gallery','view','active'),
('gallery.create','Create/upload gallery items','gallery','create','active'),
('gallery.update','Update gallery items','gallery','update','active'),
('gallery.publish','Publish gallery items','gallery','publish','active'),
('gallery.archive','Archive gallery items','gallery','archive','active'),
('gallery.delete','Delete gallery items','gallery','delete','active'),
('roles.view','View roles','roles','view','active'),
('roles.create','Create custom roles','roles','create','active'),
('roles.update','Update custom roles','roles','update','active'),
('roles.assign','Assign roles to users','roles','assign','active'),
('roles.remove','Remove roles from users','roles','remove','active'),
('roles.archive','Archive custom roles','roles','archive','active'),
('permissions.view','View permission catalog','permissions','view','active'),
('permissions.manage','Manage role permission assignments','permissions','manage','active'),
('profile.view','View permitted profile data','profile','view','active'),
('profile.update','Update permitted profile fields','profile','update','active')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module = VALUES(module),
    action = VALUES(action),
    status = 'active';

-- Preserve the legacy permission records but stop exposing them as the canonical
-- Section 28 permission catalog after their assignments have been migrated.
UPDATE permissions
SET status = 'inactive',
    module = 'legacy',
    action = 'legacy'
WHERE name IN (
    'view_dashboard',
    'manage_members',
    'manage_leave',
    'manage_holidays',
    'manage_announcements',
    'manage_office_information',
    'manage_gallery',
    'manage_roles',
    'manage_permissions',
    'view_members'
);

-- Map legacy permissions to the canonical granular permissions.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p_new.id
FROM role_permissions rp
INNER JOIN permissions p_old ON p_old.id = rp.permission_id
INNER JOIN permissions p_new
    ON p_new.name = CASE
        WHEN p_old.name = 'view_dashboard' THEN 'dashboard.view'
        WHEN p_old.name = 'view_members' THEN 'members.view'
        WHEN p_old.name = 'manage_members' THEN 'members.view'
        WHEN p_old.name = 'manage_leave' THEN 'leave.view'
        WHEN p_old.name = 'manage_holidays' THEN 'holidays.view'
        WHEN p_old.name = 'manage_announcements' THEN 'announcements.view'
        WHEN p_old.name = 'manage_office_information' THEN 'office_information.view'
        WHEN p_old.name = 'manage_gallery' THEN 'gallery.view'
        WHEN p_old.name = 'manage_roles' THEN 'roles.view'
        WHEN p_old.name = 'manage_permissions' THEN 'permissions.view'
        ELSE NULL
    END
WHERE p_old.name IN (
    'view_dashboard',
    'view_members',
    'manage_members',
    'manage_leave',
    'manage_holidays',
    'manage_announcements',
    'manage_office_information',
    'manage_gallery',
    'manage_roles',
    'manage_permissions'
);

-- Grant the complete canonical action set for legacy manage_* permissions.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p_new.id
FROM role_permissions rp
INNER JOIN permissions p_old ON p_old.id = rp.permission_id
INNER JOIN permissions p_new
    ON (
        (p_old.name = 'manage_members' AND p_new.name IN ('members.view','members.create','members.update','members.deactivate','members.archive'))
        OR (p_old.name = 'manage_leave' AND p_new.name IN ('leave.view','leave.create','leave.update','leave.cancel','leave.approve','leave.reject'))
        OR (p_old.name = 'manage_holidays' AND p_new.name IN ('holidays.view','holidays.create','holidays.update','holidays.delete'))
        OR (p_old.name = 'manage_announcements' AND p_new.name IN ('announcements.view','announcements.create','announcements.update','announcements.publish','announcements.unpublish','announcements.delete'))
        OR (p_old.name = 'manage_office_information' AND p_new.name IN ('office_information.view','office_information.create','office_information.update'))
        OR (p_old.name = 'manage_gallery' AND p_new.name IN ('gallery.view','gallery.create','gallery.update','gallery.publish','gallery.archive','gallery.delete'))
        OR (p_old.name = 'manage_roles' AND p_new.name IN ('roles.view','roles.create','roles.update','roles.assign','roles.remove','roles.archive'))
        OR (p_old.name = 'manage_permissions' AND p_new.name IN ('permissions.view','permissions.manage'))
    )
WHERE p_old.name IN (
    'manage_members',
    'manage_leave',
    'manage_holidays',
    'manage_announcements',
    'manage_office_information',
    'manage_gallery',
    'manage_roles',
    'manage_permissions'
);

-- Keep system full-access roles explicitly represented in the canonical catalog.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('ceo', 'developer')
  AND r.is_system = 1
  AND p.status = 'active';

-- Preserve and backfill user role assignments from the existing users.role field.
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
INNER JOIN roles r ON r.name = LOWER(COALESCE(u.role, 'member'))
WHERE u.id IS NOT NULL;
