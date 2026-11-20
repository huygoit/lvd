-- Hạng mục công trình: kích thước / số lượng / phụ kiện giống báo giá.
ALTER TABLE "ProjectItem"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'item',
  ADD COLUMN IF NOT EXISTS "widthMm" INTEGER,
  ADD COLUMN IF NOT EXISTS "heightMm" INTEGER,
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "accessories" JSONB NOT NULL DEFAULT '[]'::jsonb;
