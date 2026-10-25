// Bốn số trên tab Tổng quan của một công trình.
// Giá trị lấy từ hạng mục đã ghi. Chưa phải giá hợp đồng đã ký, giá báo giá hay giá quản trị.
// Thuế thu nhập doanh nghiệp = (doanh thu sau thuế − đơn hàng đã lưu − chi phí công trình) × % hồ sơ công ty.
// Không lấy chi phí chung vào phần cơ sở. Lợi nhuận chưa trừ khoản này. Lợi nhuận ròng mới trừ.

export const GHI_CHU_GIA_TRI = "Giá trị lấy từ hạng mục, chưa phải giá hợp đồng đã ký.";
export const GHI_CHU_LOI_NHUAN_RONG = "Chưa trừ thuế thu nhập doanh nghiệp.";
export const GHI_CHU_DA_TRU_THUE = "Đã trừ thuế thu nhập doanh nghiệp.";

export type NhomChiPhi = {
  nhom: string;
  nhan: string;
  tien: number;
};

export type SoTongQuan = {
  soHangMuc: number;
  truocThue: number | null;
  vatPercent: number | null;
  tienThue: number | null;
  sauThue: number | null;
  thieuSauThue: string | null;
  chiPhiChung: number | null;
  tienDonHang: number;
  tienCongTrinh: number;
  thueTndnBps: number | null;
  thueTndn: number | null;
  thieuThueTndn: string | null;
  tongChiPhi: number | null;
  thieuChiPhi: string | null;
  loiNhuan: number | null;
  thieuLoiNhuan: string | null;
  loiNhuanRong: number | null;
  thieuLoiNhuanRong: string | null;
  ghiChuRong: string;
};

function ghepThieu(mot: string | null, hai: string | null) {
  if (mot && hai) return `${mot}, ${hai.charAt(0).toLocaleLowerCase("vi")}${hai.slice(1)}`;
  return mot ?? hai;
}

export function tinhSoTongQuan(input: {
  vatPercent: number | null;
  thanhTien: number[];
  tyLeChungBps: number[];
  tienDonHang: number;
  tienCongTrinh: number;
  thueTndnBps?: number | null;
}): SoTongQuan {
  const soHangMuc = input.thanhTien.length;
  const truocThue = soHangMuc === 0 ? null : input.thanhTien.reduce((tong, tien) => tong + tien, 0);

  let tienThue: number | null = null;
  let sauThue: number | null = null;
  let thieuSauThue: string | null = null;
  if (soHangMuc === 0) {
    thieuSauThue = "Chưa có hạng mục";
  } else if (input.vatPercent === null || truocThue === null) {
    thieuSauThue = "Chưa nhập thuế";
  } else {
    tienThue = Math.round((truocThue * input.vatPercent) / 100);
    sauThue = truocThue + tienThue;
  }

  // Chi phí chung = tổng doanh thu sau thuế của hạng mục nhân từng tỷ lệ.
  let chiPhiChung: number | null = 0;
  let thieuChiPhi: string | null = null;
  if (input.tyLeChungBps.length > 0 && sauThue === null) {
    chiPhiChung = null;
    thieuChiPhi = "Chưa có doanh thu sau thuế để tính chi phí chung";
  } else {
    chiPhiChung = input.tyLeChungBps.reduce((tong, bps) => tong + Math.round(((sauThue ?? 0) * bps) / 10000), 0);
  }
  const tyLeTndn = input.thueTndnBps ?? null;
  const coSoTndn = sauThue === null ? null : sauThue - input.tienDonHang - input.tienCongTrinh;
  let thueTndn: number | null = null;
  let thieuThueTndn: string | null = null;
  if (tyLeTndn === null) {
    thieuThueTndn = "Chưa chốt thuế thu nhập doanh nghiệp";
  } else if (coSoTndn === null) {
    thieuThueTndn = "Chưa có doanh thu sau thuế để tính thuế thu nhập";
  } else {
    thueTndn = Math.round((coSoTndn * tyLeTndn) / 10000);
  }
  const tongChiPhi = chiPhiChung === null ? null : chiPhiChung + input.tienDonHang + input.tienCongTrinh;

  const duHaiVe = sauThue !== null && tongChiPhi !== null;
  const loiNhuan = duHaiVe && sauThue !== null && tongChiPhi !== null ? sauThue - tongChiPhi : null;
  const thieuLoiNhuan = duHaiVe ? null : ghepThieu(thieuSauThue, thieuChiPhi);
  const loiNhuanRong = loiNhuan !== null && thueTndn !== null ? loiNhuan - thueTndn : null;
  const thieuLoiNhuanRong = loiNhuanRong !== null ? null : loiNhuan === null ? thieuLoiNhuan : thieuThueTndn;

  return {
    soHangMuc,
    truocThue,
    vatPercent: input.vatPercent,
    tienThue,
    sauThue,
    thieuSauThue,
    chiPhiChung,
    tienDonHang: input.tienDonHang,
    tienCongTrinh: input.tienCongTrinh,
    thueTndnBps: tyLeTndn,
    thueTndn,
    thieuThueTndn,
    tongChiPhi,
    thieuChiPhi,
    loiNhuan,
    thieuLoiNhuan,
    loiNhuanRong,
    thieuLoiNhuanRong,
    ghiChuRong: thueTndn === null ? GHI_CHU_LOI_NHUAN_RONG : GHI_CHU_DA_TRU_THUE,
  };
}
