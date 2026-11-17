-- Đợt thanh toán JSON; gỡ các cột tạm ứng / ngày / thời gian thi công cũ.
ALTER TABLE "QuotationVersion"
  ADD COLUMN IF NOT EXISTS "paymentMilestones" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "QuotationVersion"
  DROP COLUMN IF EXISTS "scheduleText",
  DROP COLUMN IF EXISTS "advanceAmount",
  DROP COLUMN IF EXISTS "advanceDays",
  DROP COLUMN IF EXISTS "paymentDays",
  DROP COLUMN IF EXISTS "note";
