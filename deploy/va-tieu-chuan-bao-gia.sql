-- Cấu hình tiêu chuẩn báo giá + cột lời chào trên phiên bản.
CREATE TABLE IF NOT EXISTS "QuotationStandard" (
  "id" TEXT PRIMARY KEY,
  "greeting" TEXT NOT NULL DEFAULT 'Xin gửi báo giá với thông tin như sau:',
  "validityDays" INTEGER NOT NULL DEFAULT 15,
  "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
  "defaultTaxBps" INTEGER NOT NULL DEFAULT 1000,
  "paymentMilestones" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "quoteNote" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "QuotationVersion"
  ADD COLUMN IF NOT EXISTS "greeting" TEXT NOT NULL DEFAULT '';
