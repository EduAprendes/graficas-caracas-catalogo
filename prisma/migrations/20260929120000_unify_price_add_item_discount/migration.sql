-- AlterTable
ALTER TABLE `products` DROP COLUMN `suggestedPrice`;

-- AlterTable
ALTER TABLE `purchase_order_items` DROP COLUMN `suggestedPrice`;

-- AlterTable
ALTER TABLE `sales_order_items` ADD COLUMN `discountPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sales_order_items` DROP COLUMN `material`,
    DROP COLUMN `tipo`,
    DROP COLUMN `reverso`,
    DROP COLUMN `acabado`,
    DROP COLUMN `ancho`,
    DROP COLUMN `alto`,
    DROP COLUMN `m2`;
