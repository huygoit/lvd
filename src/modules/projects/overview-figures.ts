// Bốn số trên tab Tổng quan của một công trình.
// Giá trị lấy từ hạng mục đã ghi. Chưa phải giá hợp đồng đã ký, giá báo giá hay giá quản trị.
// Bản nền chưa lưu thuế thu nhập doanh nghiệp hay khoản trừ ngoài chi phí công trình.

export const GHI_CHU_GIA_TRI = "Giá trị lấy từ hạng mục, chưa phải giá hợp đồng đã ký.";
export const GHI_CHU_LOI_NHUAN_RONG = "Đã trừ chi phí chung, đơn hàng đã lưu và chi phí công trình. Chưa trừ thuế thu nhập.";

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

  // Doanh thu để nhân tỷ lệ là thành tiền hạng mục trước thuế. Thuế GTGT không phải doanh thu.
  let chiPhiChung: number | null = 0;
  let thieuChiPhi: string | null = null;
  if (input.tyLeChungBps.length > 0 && truocThue === null) {
    chiPhiChung = null;
    thieuChiPhi = "Chưa có doanh thu để tính chi phí chung";
  } else {
    chiPhiChung = input.tyLeChungBps.reduce((tong, bps) => tong + Math.round(((truocThue ?? 0) * bps) / 10000), 0);
  }
  const tongChiPhi = chiPhiChung === null ? null : chiPhiChung + input.tienDonHang + input.tienCongTrinh;

  const duHaiVe = sauThue !== null && tongChiPhi !== null;
  const loiNhuan = sauThue !== null && tongChiPhi !== null ? sauThue - tongChiPhi : null;
  const thieuLoiNhuan = duHaiVe ? null : ghepThieu(thieuSauThue, thieuChiPhi);

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
    tongChiPhi,
    thieuChiPhi,
    loiNhuan,
    thieuLoiNhuan,
    loiNhuanRong: loiNhuan,
    thieuLoiNhuanRong: thieuLoiNhuan,
    ghiChuRong: GHI_CHU_LOI_NHUAN_RONG,
  };
}
