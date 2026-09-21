-- PrimeIt Section 28: Authorization + RBAC
-- Additive migration. Keep users.role temporarily for compatibility.
-- Server authorization must use user_roles -> roles -> role_permissions -> permissions.

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

-- Upgrade compatible Section 25 tables when they already exist.
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS type ENUM('system','custom') NOT NULL DEFAULT 'custom',
    ADD COLUMN IF NOT EXISTS status ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS is_system TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

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

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS module VARCHAR(80) NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS action VARCHAR(80) NOT NULL DEFAULT 'view',
    ADD COLUMN IF NOT EXISTS status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO roles (name, description, type, status, is_system)
VALUES
('ceo','PrimeIt Chief Executive Officer','system','active',1),
('developer','PrimeIt Developer with authorization-management access','system','active',1),
('admin','PrimeIt Admin; permissions are explicitly assigned','system','active',1),
('hr','PrimeIt HR; permissions are explicitly assigned','system','active',1),
('member','PrimeIt Member; self-service permissions are explicitly assigned','system','active',1)
ON DUPLICATE KEY UPDATE description=VALUES(description), type=VALUES(type), is_system=VALUES(is_system);

INSERT INTO permissions (name, description, module, action)
VALUES
('dashboard.view','View the management dashboard','dashboard','view'),
('members.view','View member records','members','view'),
('members.create','Create members','members','create'),
('members.update','Update member records','members','update'),
('members.deactivate','Deactivate members','members','deactivate'),
('members.archive','Archive members','members','archive'),
('leave.view','View leave records','leave','view'),
('leave.create','Submit leave requests','leave','create'),
('leave.update','Update eligible leave requests','leave','update'),
('leave.cancel','Cancel eligible own leave requests','leave','cancel'),
('leave.approve','Approve leave requests','leave','approve'),
('leave.reject','Reject leave requests','leave','reject'),
('holidays.view','View holidays','holidays','view'),
('holidays.create','Create holidays','holidays','create'),
('holidays.update','Update holidays','holidays','update'),
('holidays.delete','Delete holidays','holidays','delete'),
('announcements.view','View announcements','announcements','view'),
('announcements.create','Create announcements','announcements','create'),
('announcements.update','Update announcements','announcements','update'),
('announcements.publish','Publish announcements','announcements','publish'),
('announcements.unpublish','Unpublish announcements','announcements','unpublish'),
('announcements.delete','Delete announcements','announcements','delete'),
('office_information.view','View office information','office_information','view'),
('office_information.create','Create office information','office_information','create'),
('office_information.update','Update office information','office_information','update'),
('gallery.view','View gallery','gallery','view'),
('gallery.create','Create/upload gallery items','gallery','create'),
('gallery.update','Update gallery items','gallery','update'),
('gallery.publish','Publish gallery items','gallery','publish'),
('gallery.archive','Archive gallery items','gallery','archive'),
('gallery.delete','Delete gallery items','gallery','delete'),
('roles.view','View roles','roles','view'),
('roles.create','Create custom roles','roles','create'),
('roles.update','Update custom roles','roles','update'),
('roles.assign','Assign roles to users','roles','assign'),
('roles.remove','Remove roles from users','roles','remove'),
('roles.archive','Archive custom roles','roles','archive'),
('permissions.view','View permission catalog','permissions','view'),
('permissions.manage','Manage role permission assignments','permissions','manage'),
('profile.view','View permitted profile data','profile','view'),
('profile.update','Update permitted profile fields','profile','update')
ON DUPLICATE KEY UPDATE description=VALUES(description), module=VALUES(module), action=VALUES(action);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
INNER JOIN roles r ON r.name = LOWER(COALESCE(u.role, 'member'))
WHERE u.id IS NOT NULL;
