-- Rút gọn bảng Contract: bỏ cột thừa (giữ data còn lại).
-- sudo -u postgres psql -d lienvietdoor -f deploy/va-hop-dong-gon.sql

ALTER TABLE "Contract" DROP COLUMN IF EXISTS "signedNumber";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "priceBasis";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "declaredSignedTotal";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "declaredAdminTotal";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "scopeText";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "paymentText";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "warrantyText";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "note";
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "effectiveOn";

ALTER TABLE "Contract" ALTER COLUMN "kind" SET DEFAULT 'thi_cong';
