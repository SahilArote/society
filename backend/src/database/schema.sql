-- ============================================================
-- GreenGate Residential Security Platform - MySQL Schema
-- Version: 1.0.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS `greengate_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `greengate_db`;

-- 1. Societies Table
CREATE TABLE IF NOT EXISTS `societies` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `role` ENUM('RESIDENT', 'GUARD', 'ADMIN') NOT NULL,
  `society_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  FOREIGN KEY (`resident_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Guards Table
CREATE TABLE IF NOT EXISTS `guards` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL UNIQUE,
  `gate_id` VARCHAR(64) NOT NULL,
  `shift` VARCHAR(32) DEFAULT 'morning',
  `status` VARCHAR(32) DEFAULT 'ON_DUTY',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`gate_id`) REFERENCES `gates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Visitors Table (Stores photo_url)
CREATE TABLE IF NOT EXISTS `visitors` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(32) DEFAULT NULL,
  `purpose` VARCHAR(64) NOT NULL,
  `visitor_type` VARCHAR(64) NOT NULL,
  `photo_url` TEXT DEFAULT NULL,
  `vehicle_number` VARCHAR(64) DEFAULT NULL,
  `delivery_company` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `responded_at` DATETIME DEFAULT NULL,
  `response_by` VARCHAR(255) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `actor_id` VARCHAR(64) NOT NULL,
  `actor_role` VARCHAR(32) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `metadata` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`society_id`) REFERENCES `societies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_user_mobile ON users(mobile);
CREATE INDEX idx_visitor_request_status ON visitor_requests(status);
CREATE INDEX idx_visitor_request_resident ON visitor_requests(resident_id);
CREATE INDEX idx_visitor_request_society ON visitor_requests(society_id);
