-- Vá schema VPS lệch sau baseline (giữ data). Chạy bằng:
--   sudo -u postgres psql -d lienvietdoor -f deploy/va-schema-vps.sql
-- Rồi: npx prisma db push && pm2 restart lienvietdoor

-- Quyền cho user app
GRANT ALL ON SCHEMA public TO lvd;
GRANT ALL ON ALL TABLES IN SCHEMA public TO lvd;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO lvd;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lvd;

-- QuotationVersion: cột thương mại / ghi chú / đại diện
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "quoteNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "customerRepresentativeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "customerRepresentativeTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "representativeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "representativeTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuotationVersion" ADD COLUMN IF NOT EXISTS "companyEmail" TEXT NOT NULL DEFAULT '';

-- QuotationItem: khối lượng ghi đè (m2)
ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "areaOverrideMilli" INTEGER;

-- Nhóm hạng mục báo giá
CREATE TABLE IF NOT EXISTS "QuoteCategoryGroup" (
  "id" TEXT PRIMARY KEY,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "sortOrder" INT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "QuoteCategoryGroup" ("id","parentId","name","sortOrder","active") VALUES
  ('nhom-cua-nhom', NULL, 'Cửa nhôm kính', 1, true),
  ('nhom-vach-kinh', NULL, 'Vách kính', 2, true),
  ('nhom-cua-cuon', NULL, 'Cửa cuốn', 3, true),
  ('nhom-chong-chay', NULL, 'Cửa chống cháy', 4, true),
  ('nhom-composite', NULL, 'Cửa composite', 5, true),
  ('nhom-lan-can', NULL, 'Lan can kính', 6, true),
  ('nhom-khac', NULL, 'Khác', 99, true)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "QuoteCategory" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
ALTER TABLE "QuoteCategory" ADD COLUMN IF NOT EXISTS "unitPrice" INTEGER NOT NULL DEFAULT 0;

UPDATE "QuoteCategory" SET "groupId" = 'nhom-khac'
WHERE "groupId" IS NULL OR "groupId" = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'QuoteCategory' AND column_name = 'groupId'
  ) THEN
    ALTER TABLE "QuoteCategory" ALTER COLUMN "groupId" SET NOT NULL;
  END IF;
END $$;

-- Trả ownership về user app (tránh permission denied khi db push)
ALTER TABLE IF EXISTS "QuoteCategoryGroup" OWNER TO lvd;
ALTER TABLE IF EXISTS "QuoteCategory" OWNER TO lvd;
ALTER TABLE IF EXISTS "QuotationVersion" OWNER TO lvd;
ALTER TABLE IF EXISTS "QuotationItem" OWNER TO lvd;
