-- ============================================================
-- GreenGate Residential Security Platform - MySQL Schema
-- Version: 1.0.0
-- ============================================================

-- 1. Societies Table
CREATE TABLE IF NOT EXISTS `societies` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Gates Table
CREATE TABLE IF NOT EXISTS `gates` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(32) DEFAULT 'OPERATIONAL',
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Users Table (Residents, Guards, Admins)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(32) NOT NULL UNIQUE,
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `pin_hash` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('RESIDENT', 'GUARD', 'ADMIN') NOT NULL,
  `society_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Flats Table
CREATE TABLE IF NOT EXISTS `flats` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `flat_number` VARCHAR(32) NOT NULL,
  `wing` VARCHAR(64) NOT NULL,
  `floor` INT DEFAULT 1,
  `resident_id` VARCHAR(64) DEFAULT NULL,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `uk_society_flat` (`society_id`, `wing`, `flat_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Guards Table
CREATE TABLE IF NOT EXISTS `guards` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL UNIQUE,
  `gate_id` VARCHAR(64) NOT NULL,
  `shift` VARCHAR(64) DEFAULT 'Morning Shift',
  `status` VARCHAR(32) DEFAULT 'ON_DUTY',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`gate_id`) REFERENCES `gates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Visitors Table (Private photo vault reference)
CREATE TABLE IF NOT EXISTS `visitors` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(32) DEFAULT NULL,
  `purpose` VARCHAR(255) NOT NULL,
  `visitor_type` VARCHAR(64) NOT NULL,
  `photo_key` VARCHAR(255) DEFAULT NULL,
  `photo_storage_type` VARCHAR(32) DEFAULT 'VAULT',
  `photo_mime_type` VARCHAR(64) DEFAULT 'image/jpeg',
  `photo_url` TEXT DEFAULT NULL,
  `vehicle_number` VARCHAR(64) DEFAULT NULL,
  `delivery_company` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Visitor Requests Table (Primary Workflow Table)
CREATE TABLE IF NOT EXISTS `visitor_requests` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `visitor_id` VARCHAR(64) NOT NULL,
  `resident_id` VARCHAR(64) NOT NULL,
  `flat_id` VARCHAR(64) NOT NULL,
  `guard_id` VARCHAR(64) NOT NULL,
  `gate_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `responded_at` DATETIME DEFAULT NULL,
  `response_by` VARCHAR(255) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `entry_time` DATETIME NULL DEFAULT NULL,
  `exit_time` DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guard_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`gate_id`) REFERENCES `gates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `recipient_id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `related_entity_id` VARCHAR(64) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `actor_id` VARCHAR(64) NOT NULL,
  `actor_role` VARCHAR(32) NOT NULL,
  `society_id` VARCHAR(64) NOT NULL,
  `request_id` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `metadata` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Announcements Table
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `priority` VARCHAR(32) DEFAULT 'normal',
  `target` VARCHAR(64) DEFAULT 'all',
  `created_by` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. OTP Records Table
CREATE TABLE IF NOT EXISTS `otp_records` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `mobile` VARCHAR(32) NOT NULL,
  `otp` VARCHAR(8) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Resident Registrations Table
CREATE TABLE IF NOT EXISTS `resident_registrations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `mobile` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) DEFAULT 'Resident',
  `wing` VARCHAR(64) NOT NULL,
  `floor` INT NOT NULL,
  `flat_id` VARCHAR(64) NOT NULL,
  `flat_number` VARCHAR(32) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT DEFAULT NULL,
  `reviewed_by` VARCHAR(64) DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Family Members Table
CREATE TABLE IF NOT EXISTS `family_members` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `resident_id` VARCHAR(64) NOT NULL,
  `flat_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `relationship` VARCHAR(64) NOT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Vehicles Table
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `resident_id` VARCHAR(64) NOT NULL,
  `flat_id` VARCHAR(64) DEFAULT NULL,
  `vehicle_number` VARCHAR(64) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'car',
  `brand` VARCHAR(64) DEFAULT '',
  `model` VARCHAR(64) DEFAULT '',
  `color` VARCHAR(32) DEFAULT '#000000',
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_user_mobile ON users(mobile);
CREATE INDEX idx_visitor_request_status ON visitor_requests(status);
CREATE INDEX idx_visitor_request_resident ON visitor_requests(resident_id);
CREATE INDEX idx_visitor_request_society ON visitor_requests(society_id);
CREATE INDEX idx_otp_mobile ON otp_records(mobile);
CREATE INDEX idx_audit_society ON audit_logs(society_id);
CREATE INDEX idx_resident_reg_mobile ON resident_registrations(mobile);
CREATE INDEX idx_resident_reg_society ON resident_registrations(society_id);
CREATE INDEX idx_resident_reg_status ON resident_registrations(status);
CREATE INDEX idx_family_resident ON family_members(resident_id);
CREATE INDEX idx_vehicles_resident ON vehicles(resident_id);

-- PRE-APPROVED VISITOR INVITATIONS (PASSES)
CREATE TABLE IF NOT EXISTS `visitor_invites` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `flat_id` VARCHAR(64) NOT NULL,
  `resident_id` VARCHAR(64) NOT NULL,
  `visitor_name` VARCHAR(128) NOT NULL,
  `visitor_phone` VARCHAR(32) DEFAULT NULL,
  `purpose` VARCHAR(64) NOT NULL DEFAULT 'guest',
  `pass_code` VARCHAR(16) NOT NULL,
  `valid_from` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `valid_until` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `used_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_invite_code ON visitor_invites(society_id, pass_code, status);
CREATE INDEX idx_invite_resident ON visitor_invites(resident_id, status);
CREATE INDEX idx_invite_flat ON visitor_invites(flat_id);

-- 15. Society Services Table (Vendors, Utilities, Staff)
CREATE TABLE IF NOT EXISTS `society_services` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `service_type` VARCHAR(32) NOT NULL DEFAULT 'VENDOR', -- 'VENDOR', 'UTILITY', 'STAFF'
  `provider_name` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `alternate_phone` VARCHAR(32) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `rating` DECIMAL(3,1) NOT NULL DEFAULT 4.5,
  `review_count` INT NOT NULL DEFAULT 0,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `timing` VARCHAR(128) DEFAULT '9:00 AM – 8:00 PM',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_services_society_type ON society_services(society_id, service_type);
CREATE INDEX idx_services_category ON society_services(society_id, category);

-- 16. Lost & Found Items Table (Community Module)
CREATE TABLE IF NOT EXISTS `lost_found_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `author_id` VARCHAR(64) NOT NULL,
  `author_name` VARCHAR(255) NOT NULL,
  `author_flat` VARCHAR(64) NOT NULL,
  `author_phone` VARCHAR(32) DEFAULT NULL,
  `type` ENUM('LOST', 'FOUND') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `incident_date` DATETIME NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `status` ENUM('ACTIVE', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_lost_found_society_status ON lost_found_items(society_id, status);
CREATE INDEX idx_lost_found_author ON lost_found_items(author_id);
CREATE INDEX idx_lost_found_type ON lost_found_items(society_id, type);

-- 17. Society Events Table (Community Module)
CREATE TABLE IF NOT EXISTS `society_events` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `society_id` VARCHAR(64) NOT NULL,
  `created_by` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'Celebration',
  `event_date` DATETIME NOT NULL,
  `end_date` DATETIME NULL DEFAULT NULL,
  `time_str` VARCHAR(64) NOT NULL,
  `venue` VARCHAR(255) NOT NULL,
  `organizer` VARCHAR(255) NOT NULL DEFAULT 'Society Committee',
  `cover_image` TEXT DEFAULT NULL,
  `capacity` INT NOT NULL DEFAULT 0, -- 0 = Unlimited
  `registration_count` INT NOT NULL DEFAULT 0,
  `status` ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_events_society_status ON society_events(society_id, status);
CREATE INDEX idx_events_date ON society_events(society_id, event_date);

-- 18. Event Registrations Table
CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `event_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `user_flat` VARCHAR(64) NOT NULL,
  `user_phone` VARCHAR(32) DEFAULT NULL,
  `guest_count` INT NOT NULL DEFAULT 1,
  `status` ENUM('REGISTERED', 'CANCELLED') NOT NULL DEFAULT 'REGISTERED',
  `registered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `society_events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_event_user` (`event_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_event_reg_user ON event_registrations(user_id);
CREATE INDEX idx_event_reg_event ON event_registrations(event_id, status);


