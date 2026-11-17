-- Gỡ ghi chú nội bộ (cột note) khỏi phiên bản báo giá.
ALTER TABLE "QuotationVersion"
  DROP COLUMN IF EXISTS "note";
