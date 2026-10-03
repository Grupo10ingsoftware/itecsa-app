-- Reuse the existing audit log. Nullable fields preserve historical events.
-- event_key serializes attempts/results; metadata contains allowlisted technical evidence only.
ALTER TABLE `SecurityAuditEvent`
    ADD COLUMN `event_key` VARCHAR(100) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `security_audit_event_key` (`event_key`);
