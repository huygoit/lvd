/**
 * Catalog biến mẫu báo giá Excel (hang-muc-mau.xlsx, sheet 2212).
 * Biến đơn = 1 ô. Bảng dong[] = vùng lặp từ dòng bodyStart.
 * Nhãn cố định (BÊN A, STT…) không phải biến — nằm sẵn trong file mẫu.
 */

export type ScalarVar = {
  key: string;
  label: string;
  cell: string;
  sample: string;
  required: boolean;
};

export type TableColumnVar = {
  key: string;
  label: string;
  column: string;
};

/** Ánh xạ cố định theo layout mẫu LVD hiện dùng. */
export const quoteTemplateLayout = {
  kind: "bao_gia_excel" as const,
  defaultSheet: "2212",
  /** Dòng tiêu đề bảng (STT, KH…). */
  headerRow: 9,
  /** Dòng phụ header W/H. */
  subHeaderRow: 10,
  /** Dòng đầu vùng dữ liệu (nhóm hoặc chi tiết). */
  bodyStartRow: 11,
  /**
   * Các neo cuối file — engine tìm theo nội dung sau khi đổ bảng,
   * vì số dòng bảng thay đổi.
   */
  anchors: {
    tongCong: "TỔNG CỘNG (TRƯỚC THUẾ)",
    ghiChuLabel: "Ghi chú:",
    chuKyCdt: "Xác nhận CĐT",
    chuKyNguoiLap: "Người lập",
    chuKyGiamDoc: "GIÁM ĐỐC",
  },
};

export const quoteScalarVars: ScalarVar[] = [
  { key: "ben_a.ten", label: "Bên A — tên khách / CĐT", cell: "C3", sample: "Bệnh viện C Đà Nẵng", required: true },
  {
    key: "ben_a.dai_dien",
    label: "Bên A — đại diện",
    cell: "F3",
    sample: "Đại diện: Ông Nguyễn Trọng Thiện - Giám đốc",
    required: false,
  },
  {
    key: "ben_b.ten",
    label: "Bên B — tên công ty",
    cell: "C4",
    sample: "CTY TNHH MTV LIÊN VIỆT DOOR",
    required: true,
  },
  {
    key: "ben_b.dai_dien",
    label: "Bên B — đại diện",
    cell: "F4",
    sample: "Đại diện: Ông Trần Quang Dũng - Giám đốc",
    required: false,
  },
  { key: "cong_trinh.ten", label: "Công trình", cell: "C5", sample: "Sửa chữa tài sản công năm 2025…", required: true },
  { key: "hang_muc.ten", label: "Hạng mục", cell: "C6", sample: "Sửa chữa tài sản công năm 2025…", required: false },
  {
    key: "ngay_lap_chuoi",
    label: "Ngày lập (chuỗi đầy đủ)",
    cell: "K6",
    sample: "Đà Nẵng, ngày 22 tháng 12 năm 2025",
    required: true,
  },
  {
    key: "dia_diem",
    label: "Địa điểm",
    cell: "C7",
    sample: "122 Hải Phòng, phường Hải Châu, thành phố Đà Nẵng",
    required: false,
  },
  {
    key: "ghi_chu",
    label: "Ghi chú cuối bảng",
    cell: "C35",
    sample: "Đơn giá chưa bao gồm thuế 8% VAT, đã bao gồm nhân công…",
    required: false,
  },
  { key: "tong.khoi_luong", label: "Tổng khối lượng", cell: "neo:tongCong → cột I", sample: "69.91", required: true },
  { key: "tong.truoc_thue", label: "Tổng trước thuế", cell: "neo:tongCong → cột K", sample: "144,463,780", required: true },
];

export const quoteTableColumns: TableColumnVar[] = [
  { key: "stt", label: "STT", column: "A" },
  { key: "ky_hieu", label: "KH (ký hiệu)", column: "B" },
  { key: "chung_loai", label: "Chủng loại sản phẩm", column: "C" },
  { key: "don_vi", label: "Đơn vị tính", column: "E" },
  { key: "rong", label: "Quy cách W (mm)", column: "F" },
  { key: "cao", label: "Quy cách H (mm)", column: "G" },
  { key: "so_luong", label: "Số lượng (bộ)", column: "H" },
  { key: "khoi_luong", label: "Khối lượng đơn vị", column: "I" },
  { key: "don_gia", label: "Đơn giá", column: "J" },
  { key: "thanh_tien", label: "Thành tiền", column: "K" },
  { key: "ghi_chu", label: "Ghi chú dòng", column: "L" },
];

export type PreviewRow =
  | {
      loai: "nhom";
      chung_loai: string;
      khoi_luong: number;
      thanh_tien: number;
    }
  | {
      loai: "chi_tiet";
      stt: number | "";
      ky_hieu: string;
      chung_loai: string;
      don_vi: string;
      rong: number;
      cao: number;
      so_luong: number;
      khoi_luong: number;
      don_gia: number;
      thanh_tien: number;
      ghi_chu: string;
    };

/** Dữ liệu mẫu để xem trước cách đổ biến (rút gọn từ file gốc). */
export const quotePreviewSample = {
  scalars: Object.fromEntries(quoteScalarVars.map((item) => [item.key, item.sample])) as Record<string, string>,
  dong: [
    { loai: "nhom", chung_loai: "Cửa đi", khoi_luong: 10.74, thanh_tien: 20_460_000 },
    {
      loai: "chi_tiet",
      stt: 1,
      ky_hieu: "D1",
      chung_loai: "Cửa đi 1 cánh kết hợp vách",
      don_vi: "m2",
      rong: 1000,
      cao: 3000,
      so_luong: 1,
      khoi_luong: 3,
      don_gia: 2_200_000,
      thanh_tien: 6_600_000,
      ghi_chu: "",
    },
    {
      loai: "chi_tiet",
      stt: "",
      ky_hieu: "",
      chung_loai: "Vách kính",
      don_vi: "m2",
      rong: 500,
      cao: 2200,
      so_luong: 1,
      khoi_luong: 1.1,
      don_gia: 1_500_000,
      thanh_tien: 1_650_000,
      ghi_chu: "",
    },
    {
      loai: "chi_tiet",
      stt: 2,
      ky_hieu: "D2",
      chung_loai: "Cửa đi 1 cánh kết hợp vách",
      don_vi: "m2",
      rong: 1000,
      cao: 3000,
      so_luong: 1,
      khoi_luong: 3,
      don_gia: 2_200_000,
      thanh_tien: 6_600_000,
      ghi_chu: "",
    },
    {
      loai: "chi_tiet",
      stt: "",
      ky_hieu: "",
      chung_loai: "Vách kính",
      don_vi: "m2",
      rong: 1200,
      cao: 2200,
      so_luong: 1,
      khoi_luong: 2.64,
      don_gia: 1_500_000,
      thanh_tien: 3_960_000,
      ghi_chu: "",
    },
    { loai: "nhom", chung_loai: "Cửa sổ + Vách kính", khoi_luong: 8.27, thanh_tien: 15_693_000 },
    {
      loai: "chi_tiet",
      stt: 1,
      ky_hieu: "S1",
      chung_loai: "Cửa sổ 1 cánh mở hất",
      don_vi: "m2",
      rong: 2440,
      cao: 3000,
      so_luong: 1,
      khoi_luong: 7.32,
      don_gia: 1_950_000,
      thanh_tien: 14_274_000,
      ghi_chu: "",
    },
    {
      loai: "chi_tiet",
      stt: 2,
      ky_hieu: "S",
      chung_loai: "Vách kính",
      don_vi: "m2",
      rong: 430,
      cao: 2200,
      so_luong: 1,
      khoi_luong: 0.95,
      don_gia: 1_500_000,
      thanh_tien: 1_419_000,
      ghi_chu: "",
    },
  ] satisfies PreviewRow[],
  tong: { khoi_luong: 19.01, truoc_thue: 36_153_000 },
};
