-- P18: migración aditiva generada y contrastada con Prisma. Sin cambios de negocio.
-- CreateTable
CREATE TABLE `PrivacyRequest` (
    `id` CHAR(36) NOT NULL,
    `owner_auth0` VARCHAR(128) NULL,
    `subject_kind` VARCHAR(20) NOT NULL,
    `subject_id` INTEGER NULL,
    `rights` JSON NOT NULL,
    `document_cipher` LONGTEXT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'received',
    `received_at` DATETIME(3) NOT NULL,
    `due_at` DATETIME(3) NOT NULL,
    `block_due_at` DATETIME(3) NULL,
    `block_decided_at` DATETIME(3) NULL,
    `verified_at` DATETIME(3) NULL,
    `extension_used` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `privacy_owner_received`(`owner_auth0`, `received_at`),
    INDEX `privacy_status_due`(`status`, `due_at`),
    INDEX `privacy_block_due`(`block_due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivacyAction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` CHAR(36) NOT NULL,
    `actor_auth0` VARCHAR(128) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `detail_cipher` LONGTEXT NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `privacy_action_request`(`request_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivacyRestriction` (
    `id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `domains` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `activated_at` DATETIME(3) NOT NULL,
    `released_at` DATETIME(3) NULL,

    UNIQUE INDEX `PrivacyRestriction_request_id_key`(`request_id`),
    INDEX `privacy_restriction_active`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PrivacyAction` ADD CONSTRAINT `PrivacyAction_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `PrivacyRequest`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivacyRestriction` ADD CONSTRAINT `PrivacyRestriction_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `PrivacyRequest`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
