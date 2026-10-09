-- PRECONDICION: ejecutar exclusivamente después del preflight y de reconciliar
-- el historial Prisma según docs/ORDERS_MIGRACION.md. No aplicar automáticamente
-- sobre la base compartida.

CREATE TABLE `SecurityThrottle` (
  `id_security_throttle` INT NOT NULL AUTO_INCREMENT,
  `scope` VARCHAR(50) NOT NULL,
  `subject_hash` CHAR(64) NOT NULL,
  `window_started_at` DATETIME(3) NOT NULL,
  `request_count` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `scope_subject_hash` (`scope`, `subject_hash`),
  INDEX `idx_security_throttle_expiry` (`expires_at`),
  PRIMARY KEY (`id_security_throttle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SecurityAuditEvent` (
  `id_security_audit_event` BIGINT NOT NULL AUTO_INCREMENT,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `event_type` VARCHAR(80) NOT NULL,
  `actor_user_id` INT NULL,
  `action` VARCHAR(80) NULL,
  `resource_type` VARCHAR(60) NULL,
  `resource_id` VARCHAR(120) NULL,
  `request_id` CHAR(36) NULL,
  `outcome` VARCHAR(30) NOT NULL,
  `reason_code` VARCHAR(80) NULL,
  INDEX `idx_security_audit_occurred` (`occurred_at`),
  INDEX `idx_security_audit_actor` (`actor_user_id`, `occurred_at`),
  INDEX `idx_security_audit_request` (`request_id`),
  PRIMARY KEY (`id_security_audit_event`),
  CONSTRAINT `fk_security_audit_user`
    FOREIGN KEY (`actor_user_id`) REFERENCES `Usuario` (`id_usuario`)
    ON DELETE SET NULL ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `idx_orders_cursor`
  ON `Pedidos` (`id_pedido` DESC);

CREATE INDEX `idx_records_order_cursor`
  ON `Registros` (`id_pedido`, `FECHA_HORA` DESC, `ID_REGISTRO` DESC);
