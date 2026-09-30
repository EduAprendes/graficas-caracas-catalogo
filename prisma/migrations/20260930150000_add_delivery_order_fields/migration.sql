-- AlterTable
ALTER TABLE `customers` ADD COLUMN `taxId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales_orders` ADD COLUMN `driverName` VARCHAR(191) NULL,
    ADD COLUMN `driverIdNumber` VARCHAR(191) NULL,
    ADD COLUMN `vehiclePlate` VARCHAR(191) NULL,
    ADD COLUMN `deliveryControlNumber` VARCHAR(191) NULL,
    ADD COLUMN `deliveryPrinterInfo` VARCHAR(191) NULL;
