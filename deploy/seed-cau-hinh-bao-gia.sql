-- Seed cấu hình báo giá (id = mac-dinh) từ dữ liệu local 2026-11-17.
-- Chạy trên VPS:
--   sudo -u postgres psql -d lienvietdoor -f deploy/seed-cau-hinh-bao-gia.sql
-- Cần có cột quoteNote trước (xem va-ghi-chu-mac-dinh-bao-gia.sql).

INSERT INTO "QuotationStandard" (
  "id",
  "greeting",
  "validityDays",
  "warrantyMonths",
  "defaultTaxBps",
  "paymentMilestones",
  "quoteNote",
  "updatedAt"
) VALUES (
  'mac-dinh',
  $loi$Lời đầu tiên, Công ty TNHH Liên Việt Door xin gửi tới Quý khách lời chào trân trọng và lời cảm ơn vì đã quan tâm đến sản phẩm, dịch vụ của chúng tôi.
Theo yêu cầu của Quý khách, chúng tôi xin gửi báo giá như sau:$loi$,
  15,
  6,
  -1,
  $moc$[
    {"content":"Tạm ứng, ngay sau khi ký kết hợp đồng","value":"40"},
    {"content":"Ngay khi tập kết vật tư xuống công trình","value":"30"},
    {"content":"Quyết toán còn lại","value":"30"}
  ]$moc$::jsonb,
  $gc$- Giá trên đã bao gồm chi phí lắp đặt và cước vận chuyển
- Bảo hành theo tiêu chuẩn nhà sản xuất$gc$,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "greeting" = EXCLUDED."greeting",
  "validityDays" = EXCLUDED."validityDays",
  "warrantyMonths" = EXCLUDED."warrantyMonths",
  "defaultTaxBps" = EXCLUDED."defaultTaxBps",
  "paymentMilestones" = EXCLUDED."paymentMilestones",
  "quoteNote" = EXCLUDED."quoteNote",
  "updatedAt" = CURRENT_TIMESTAMP;
