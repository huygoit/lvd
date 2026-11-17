-- Ghi chú mặc định trên cấu hình báo giá.
ALTER TABLE "QuotationStandard"
  ADD COLUMN IF NOT EXISTS "quoteNote" TEXT NOT NULL DEFAULT '';
