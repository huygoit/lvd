-- Thêm cột danh sách phụ kiện con trên dòng báo giá (JSON).
ALTER TABLE "QuotationItem"
  ADD COLUMN IF NOT EXISTS "accessories" JSONB NOT NULL DEFAULT '[]'::jsonb;
