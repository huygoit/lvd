-- Nâng cột tiền dòng báo giá lên BIGINT (tránh lỗi vượt INT4 ~2.1 tỷ).
ALTER TABLE "QuotationItem"
  ALTER COLUMN "mainUnitPrice" TYPE BIGINT,
  ALTER COLUMN "accessoryUnitPrice" TYPE BIGINT,
  ALTER COLUMN "discountAmount" TYPE BIGINT,
  ALTER COLUMN "mainAmount" TYPE BIGINT,
  ALTER COLUMN "accessoryAmount" TYPE BIGINT,
  ALTER COLUMN "discountValue" TYPE BIGINT,
  ALTER COLUMN "pretax" TYPE BIGINT,
  ALTER COLUMN "taxAmount" TYPE BIGINT,
  ALTER COLUMN "posttax" TYPE BIGINT;
