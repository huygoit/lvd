import { PrismaClient } from "@prisma/client";

// Khách hàng, công trình của khách đó, và hạng mục công trình lấy từ máy local ngày 2026-10-30.
// Không gồm người liên hệ, tài khoản ngân hàng, đơn hàng, chi phí hay tài liệu.
// Nhân viên Ngô Quốc Huy được tạo kèm vì đang là người phụ trách công trình. Lê Hà đã có trong seed tài khoản.

const phuTrach = {
  "id": "2948eb40-4552-47a6-bde0-14472b92ab22",
  "name": "Ngô Quốc Huy"
};

const khachHang = [
  {
    "id": "cmvhhl2id00b0w3n82fighw94",
    "code": "KH-2026-0002",
    "type": "doanh_nghiep",
    "name": "CÔNG TY CỎ PHẦN VINACONEX 25",
    "shortName": "",
    "taxCode": "4000378261",
    "phone": "0236362163",
    "fax": "0236362163",
    "altPhone": "",
    "email": "",
    "address": "89A Phan Đăng Lưu, Phường Hoà Cường, TP Đà Nẵng",
    "invoiceName": "",
    "invoiceTaxCode": "4000378261",
    "invoiceAddress": "89A Phan Đăng Lưu, Phường Hoà Cường, TP Đà Nẵng",
    "invoiceEmail": "",
    "representativeName": "Ông Nguyễn Văn Trung",
    "representativeTitle": "Tồng Giám đốc",
    "executorName": "Ông Nguyễn Quang Lắm",
    "executorTitle": "Giám đốc Ban 5",
    "ownerId": "ha",
    "source": "",
    "note": "",
    "status": "dang_dung",
    "revision": 2,
    "createdAt": "2026-10-21T02:22:04.021Z"
  }
];

const congTrinh = [
  {
    "id": "cmvhhlyd400b4w3n8nk893p79",
    "code": "CT-2026-0002",
    "name": "Cung cấp và lắp đặt cửa nhôm, vách kính ký túc xá Dom C",
    "customerId": "cmvhhl2id00b0w3n82fighw94",
    "location": "Phường Tân Đông Hiệp – Thành phố Hồ Chí Minh",
    "venture": "Đầu tư xây dựng Tồ hợp Giáo dục - Đào tạo (Đại học, đào tạo nghề, trung học phổ thông, trung học cơ sở, tiểu học) - Giai đoạn 1, Thành phố Tân Uyên, tỉnh Bình Dương.",
    "bidPackage": "Thi công xây lắp Ký túc xá Dom C",
    "startedOn": "2026-07-31",
    "endedOn": "2026-10-31",
    "vatPercent": 8,
    "ownerId": "2948eb40-4552-47a6-bde0-14472b92ab22",
    "note": "",
    "stage": "da_chot",
    "revision": 8,
    "createdAt": "2026-10-21T02:22:45.304Z"
  }
];

const hangMuc = [
  {
    "id": "cmvmaavdn0000w3t0ei1cccyz",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 1,
    "name": "D1: Cửa đi 2 cánh mở quay + ô gió mở lật, kích thước 1400x2700, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 2 cánh mở quay và ô gió trên mở lật\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đơn điểm)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 226800,
    "unitPrice": 3549600,
    "ownerId": "ha",
    "note": ".",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0001w3t0g7wlruce",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 2,
    "name": "D2: Cửa đi 2 cánh trượt, 2 cánh fix, kích thước 3700x2200, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 2 cánh trượt, 2 cánh fix\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm,\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, con lăn cửa trượt)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 561660,
    "unitPrice": 2961600,
    "ownerId": "ha",
    "note": ".",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0002w3t00fwg8ld5",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 3,
    "name": "D3: Cửa đi 1 cánh mở quay, kích thước 900x2200, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 1 cánh mở quay\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm,\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, chốt âm)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 77220,
    "unitPrice": 3568800,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0003w3t08guxk1vd",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 4,
    "name": "D4: Cửa đi 1 cánh mở quay, kích thước 800x2200, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 1 cánh mở quay\n- Nhôm: Sử dụng nhôm Xingfa (Quảng Đông - nhà máy nhôm Xingfa Quảng Đông - Trung Quốc), hệ khung cửa thuỷ lực\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ kiện: Kinlong chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, chốt âm)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 3520,
    "unitPrice": 3747600,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0004w3t0fhrai3c1",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 5,
    "name": "D5: Cửa đi 4 cánh mở quay, kích thước 6070x2700, khung nhôm hệ xingfa, kính dán an toàn 10.38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 4 cánh mở quay + 2 vách kính cố định + ô gió trên mở hắt\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm,  vách kính mặt dựng trung bình 2.5mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 10,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, chốt âm)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 16389,
    "unitPrice": 3087600,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0005w3t0sm3mae8w",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 6,
    "name": "D6: Cửa đi 1 cánh mở quay, ô cửa sổ mở quay kết hợp louver nhôm, kích thước 2500x2700, khung nhôm hệ xingfa, kính dán an toàn 8.38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 1 cánh mở quay, 2 cửa sổ mở quay, 1 cửa sổ mở hắt, kết hợp louver nhôm\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, tay nắm gạt, chặn cửa, chốt âm, bản lề chữ A, bản lề cửa)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 40500,
    "unitPrice": 3339600,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0006w3t007lw5ugh",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 7,
    "name": "D7: Cửa đi 1 cánh mở quay, cửa sổ 1 cánh mở quay, kích thước 1770x2700, khung nhôm hệ xingfa, kính dán an toàn 8.38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 1 cánh mở quay, 1 cửa sổ mở quay, 1 cửa sổ mở hắt, kết hợp louver nhôm\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, tay nắm gạt, chặn cửa, chốt âm, bản lề chữ A, bản lề cửa)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 47790,
    "unitPrice": 3547200,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0007w3t0alxezd5q",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 8,
    "name": "D8: Khung kính, Cửa đi 3 cánh mở quay, ô gió trên mở lật, kích thước 2200x2700, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa đi 3 cánh mở quay, ô gió mở lật\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, tay nắm gạt, chặn cửa, chốt âm, bản lề chữ A, bản lề cửa)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 53460,
    "unitPrice": 3579600,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0008w3t0luzyzxc3",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 9,
    "name": "D9: Cửa đi 2 cánh mở ra, pano cửa chớp nhôm, kích thước 1150x2700, khung nhôm xinfa hoàn thiện sơn tĩnh điện, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa chớp nhôm 2 cánh mở quay\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, pano chớp nhôm màu ghi đậm\n- Phụ Kiện: theo nhà sản xuất\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 3105,
    "unitPrice": 4608000,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn0009w3t0h7c1jclu",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 10,
    "name": "D10: Cửa đi 2 cánh mở quay, ô gió mở lật, kích thước 1400x2700mm, khung nhôm hệ Xingfa, hoàn thiện sơn tĩnh điện, kính dán an toàn dày 10,38mm, bao gồm phụ kiện trọn bộ",
    "spec": "- Cửa đi 2 cánh mở quay không đều, ô gió mở hắt\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 10,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, tay nắm gạt, chặn cửa, chốt âm, bản lề chữ A, bản lề cửa)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 3780,
    "unitPrice": 3549600,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000aw3t0j95t4lnz",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 12,
    "name": "D12: Cửa đi 1 cánh mở quay, ô gió mở lật, kích thước 900x2700mm, khung nhôm hệ Xingfa, kính dán an toàn dày 8,38mm, bao gồm phụ kiện trọn bộ",
    "spec": "- Cửa đi 1 cánh mở quay không đều, 1 cửa sổ mở hắt\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa đi trung bình 2.0mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm, bản lề 3D, khoá, gear đa điểm, tay nắm gạt, chặn cửa, chốt âm, bản lề chữ A, bản lề cửa)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 2430,
    "unitPrice": 3631200,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000bw3t09rq5h8e4",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 13,
    "name": "W-01: Cửa sổ 2 cánh mở quay, ô gió mở hất, kích thước 900x1600mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa sổ 2 cánh mở quay, ô gió mở hắt\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 312480,
    "unitPrice": 3512400,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000cw3t0yie20pa6",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 14,
    "name": "W-02: Cửa sổ 1 cánh mở quay, ô gió mở hất, kích thước 700x1600mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa sổ 1 cánh mở quay, ô gió mở hắt\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 33600,
    "unitPrice": 3631200,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000dw3t0qntc9pjo",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 15,
    "name": "W-05: Cửa sổ 2 cánh mở quay, kích thước 1085x1600mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa sổ 2 cánh mở quay\n- Nhôm: Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (bản lề chữ quay, tay nắm cài)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 15624,
    "unitPrice": 2983200,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000ew3t0xzbyfe97",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 16,
    "name": "W-06: Vách kính cố định, ô gió mở hất, kích thước 370x1300mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Vách kính hệ mặt dựng + ô gió mở hắt\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 9620,
    "unitPrice": 3384000,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000fw3t0o526hftj",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 17,
    "name": "W-07: Vách kính cố định, ô gió mở hất, kích thước 1100x2700mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Vách kính cố định + ô gió mở hắt\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng  (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 2970,
    "unitPrice": 2527200,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdn000gw3t0w817m4dl",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 18,
    "name": "W-08: Vách kính cố định, 1 cánh mở qquay, kích thước 1750x2700mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm, dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Vách kính cố định + cửa sổ 1 cánh mở quay\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng  (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 18900,
    "unitPrice": 2510400,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdo000hw3t0ozcrd342",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 19,
    "name": "W-09: Cửa sổ 2 cánh mở quay, ô gió mở hất, kích thước 1000x1600mm, khung nhôm hệ xingfa, kính dán an toàn 8,38mm dán mờ 1 mặt, bao gồm phụ kiện đồng bộ",
    "spec": "- Cửa sổ 2 cánh mở quay, 1 cánh mở hắt\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 3200,
    "unitPrice": 3394800,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdo000iw3t0hl1vi3ox",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 20,
    "name": "VK-01: Cửa sổ mở lật kết hợp ô fix, kích thước 1800x1600mm, khung nhôm hệ xingfa, kính dãn an toàn 8.38mm dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Vách kính cố định + 2 cửa sổ mở hắt\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, cửa sổ 1.4mm, nẹp kính 1.0mm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng  (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 14400,
    "unitPrice": 2996400,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmaavdo000jw3t0vidtjp6y",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 21,
    "name": "VK-02: Cửa sổ mở lật kết hợp louver nhôm, kích thước 2500x2600mm, khung nhôm hệ xingfa, kính dãn an toàn 8.38mm dán decal mờ, bao gồm phụ kiện đồng bộ",
    "spec": "- Louver nhôm cấp khí bù+ 3 cửa sổ mở hắt\n- Nhôm:Sử dụng nhôm Xingfa (Xingfa GuangDong - Trung Quốc), hệ 55 độ dày trung bình 1.4mm, cửa sổ 1.4mm, nẹp kính 1.0mm, louver nhôm\n- Kính: Trắng an toàn 8,38mm, dán decal mờ\n- Màu sơn: CĐT phê duyệt (Bảo hành 10 năm)\n- Phụ Kiện: : KINLONG chính hãng  (Tay nắm gạt, than khóa đa điêm, bản lề chữ A)\n-VTP: Silicon trung tính, vít lắp đặt....",
    "unit": "m2",
    "quantityMilli": 26000,
    "unitPrice": 3214800,
    "ownerId": "ha",
    "note": "",
    "createdAt": "2026-10-24T10:57:01.787Z"
  },
  {
    "id": "cmvmimvj2000rw3b4rnnzaka2",
    "projectId": "cmvhhlyd400b4w3n8nk893p79",
    "sortOrder": 22,
    "name": "3: Cửa đi 1 cánh mở quay, kích\nthước 900x2200, khung nhôm hệ\nxingfa, kính dán an toàn 8,38mm,\ngồm phụ kiện đồng bộ (ngăn mùi",
    "spec": "",
    "unit": "m2",
    "quantityMilli": 136620,
    "unitPrice": 3568800,
    "ownerId": "ha",
    "note": "PL01/1107/2026/VC25-LV",
    "createdAt": "2026-10-24T14:50:18.782Z"
  }
];

const prisma = new PrismaClient();

async function main() {
  await prisma.staff.upsert({
    where: { id: phuTrach.id },
    update: { name: phuTrach.name, active: true },
    create: { id: phuTrach.id, name: phuTrach.name, active: true },
  });

  for (const row of khachHang) {
    const { createdAt, ...data } = row;
    await prisma.customer.upsert({
      where: { id: row.id },
      update: data,
      create: { ...data, createdAt: new Date(createdAt) },
    });
  }

  for (const row of congTrinh) {
    const { createdAt, ...data } = row;
    await prisma.project.upsert({
      where: { id: row.id },
      update: data,
      create: { ...data, createdAt: new Date(createdAt) },
    });
  }

  for (const row of hangMuc) {
    const { createdAt, ...data } = row;
    await prisma.projectItem.upsert({
      where: { id: row.id },
      update: data,
      create: { ...data, createdAt: new Date(createdAt) },
    });
  }

  console.log("Đã nạp " + khachHang.length + " khách, " + congTrinh.length + " công trình, " + hangMuc.length + " hạng mục.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
