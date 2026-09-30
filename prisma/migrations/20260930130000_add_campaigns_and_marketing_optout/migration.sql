-- AlterTable
ALTER TABLE `customers` ADD COLUMN `marketingOptOut` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(191) NOT NULL,
    `highlight` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `audience` VARCHAR(191) NOT NULL,
    `recipients` INTEGER NOT NULL,
    `sent` INTEGER NOT NULL,
    `failed` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaigns_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
