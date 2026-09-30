-- AlterTable
ALTER TABLE `users` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
    ADD COLUMN `sellerId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_sellerId_key` ON `users`(`sellerId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
