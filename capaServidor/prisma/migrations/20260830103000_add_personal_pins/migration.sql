ALTER TABLE `Usuario`
    MODIFY COLUMN `pin_hash` VARCHAR(255) NULL,
    ADD COLUMN `pin_salt` VARCHAR(64) NULL,
    ADD COLUMN `pin_fingerprint` CHAR(64) NULL,
    ADD COLUMN `pin_pending_ciphertext` TEXT NULL,
    ADD COLUMN `pin_pending_iv` VARCHAR(64) NULL,
    ADD COLUMN `pin_pending_tag` VARCHAR(64) NULL,
    ADD COLUMN `pin_accepted_at` DATETIME(3) NULL,
    ADD COLUMN `pin_failed_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pin_locked_until` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Usuario_pin_fingerprint_key`
    ON `Usuario`(`pin_fingerprint`);

CREATE TABLE `PinRecoveryChallenge` (
    `id_pin_recovery_challenge` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `code_salt` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `failed_attempts` INTEGER NOT NULL DEFAULT 0,
    `used_at` DATETIME(3) NULL,
    `delivery_status` VARCHAR(30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `idx_pin_recovery_user_created`(`id_usuario`, `created_at`),
    PRIMARY KEY (`id_pin_recovery_challenge`),
    CONSTRAINT `fk_pin_recovery_usuario`
        FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`)
        ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
