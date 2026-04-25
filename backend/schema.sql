-- ============================================================================
-- Machine Maintenance Tracker - Database Schema
-- Database: mantenimientos
-- ============================================================================

CREATE DATABASE IF NOT EXISTS mantenimientos;
USE mantenimientos;

-- ============================================================================
-- 1. config — application configuration (cycle start date, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Week 1 of 2026 starts Monday Jan 5 (ISO week standard)
-- The system uses calendar year weeks: Week 1 = first full week of January
INSERT INTO config (config_key, config_value, description) VALUES
  ('cycle_year', '2026', 'Current maintenance cycle year'),
  ('cycle_start_date', '2026-01-05', 'Monday of Week 1 for the current cycle year')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ============================================================================
-- 2. `lines` — production lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS `lines` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO `lines` (name, display_order) VALUES
  ('Línea 1', 1),
  ('Línea 2', 2),
  ('Línea 3', 3),
  ('Línea 4', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================================
-- 3. machines — machines per production line
-- ============================================================================
CREATE TABLE IF NOT EXISTS machines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  line_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (line_id) REFERENCES `lines`(id) ON DELETE CASCADE
);

-- ============================================================================
-- 4. maintenance_tasks — task definitions with frequency
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  machine_id INT NOT NULL,
  description VARCHAR(500) NOT NULL,
  frequency ENUM('weekly','monthly','semiannual','annual') NOT NULL,
  requires_photo BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. maintenance_records — completed maintenance sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  line_id INT NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL,
  operator_num_empleado VARCHAR(20) NOT NULL,
  operator_name VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  status ENUM('in_progress','completed') DEFAULT 'in_progress',
  notes TEXT,
  FOREIGN KEY (line_id) REFERENCES `lines`(id),
  INDEX idx_week_year (year, week_number),
  INDEX idx_line_week (line_id, year, week_number)
);

-- ============================================================================
-- 6. task_completions — individual task checkbox results
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_completions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  record_id INT NOT NULL,
  task_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  completed_by VARCHAR(20),
  notes TEXT,
  FOREIGN KEY (record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id),
  UNIQUE KEY uk_record_task (record_id, task_id)
);

-- ============================================================================
-- 7. task_photos — before/after photos per task completion
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  completion_id INT NOT NULL,
  photo_type ENUM('before','after') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by VARCHAR(20),
  FOREIGN KEY (completion_id) REFERENCES task_completions(id) ON DELETE CASCADE
);
