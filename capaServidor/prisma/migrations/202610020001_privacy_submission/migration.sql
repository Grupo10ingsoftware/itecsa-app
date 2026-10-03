-- Technical receipt/remission evidence only; no personal request content.
CREATE TABLE `PrivacySubmission` (
    `id` CHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `recipient` VARCHAR(254) NOT NULL,
    `sender` VARCHAR(254) NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `provider_id` VARCHAR(128) NULL,
    `sent_at` DATETIME(3) NULL,
    `error_code` VARCHAR(40) NULL,
    INDEX `privacy_submission_received`(`received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
