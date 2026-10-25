import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GHI_CHU_DA_TRU_THUE, GHI_CHU_LOI_NHUAN_RONG, tinhSoTongQuan } from "@/modules/projects/overview-figures";

describe("số tổng quan một công trình", () => {
  it("cộng thành tiền rồi làm tròn thuế trên tổng", () => {
    const so = tinhSoTongQuan({ vatPercent: 10, thanhTien: [1_000, 2_500], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 400 });
    assert.equal(so.truocThue, 3_500);
    assert.equal(so.tienThue, 350);
    assert.equal(so.sauThue, 3_850);
    assert.equal(so.tongChiPhi, 400);
    assert.equal(so.loiNhuan, 3_450);
    assert.equal(so.loiNhuanRong, null);
    assert.equal(so.thieuLoiNhuanRong, "Chưa chốt thuế thu nhập doanh nghiệp");
    assert.equal(so.ghiChuRong, GHI_CHU_LOI_NHUAN_RONG);
  });

  it("làm tròn đồng khi thuế lẻ", () => {
    const so = tinhSoTongQuan({ vatPercent: 10, thanhTien: [333], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 1 });
    assert.equal(so.tienThue, 33);
    assert.equal(so.sauThue, 366);
  });

  it("thuế suất 0 vẫn ra số sau thuế, không coi là chưa nhập", () => {
    const so = tinhSoTongQuan({ vatPercent: 0, thanhTien: [1_000], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 200 });
    assert.equal(so.tienThue, 0);
    assert.equal(so.sauThue, 1_000);
    assert.equal(so.loiNhuan, 800);
  });

  it("chưa nhập thuế thì không bịa sau thuế bằng trước thuế", () => {
    const so = tinhSoTongQuan({ vatPercent: null, thanhTien: [1_000], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 200 });
    assert.equal(so.truocThue, 1_000);
    assert.equal(so.sauThue, null);
    assert.equal(so.thieuSauThue, "Chưa nhập thuế");
    assert.equal(so.loiNhuan, null);
    assert.equal(so.thieuLoiNhuan, "Chưa nhập thuế");
    assert.equal(so.loiNhuanRong, null);
  });

  it("chưa ghi khoản nào thì tổng chi phí là 0 và vẫn ra lợi nhuận", () => {
    const so = tinhSoTongQuan({ vatPercent: 8, thanhTien: [1_000], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 0 });
    assert.equal(so.sauThue, 1_080);
    assert.equal(so.chiPhiChung, 0);
    assert.equal(so.tongChiPhi, 0);
    assert.equal(so.thieuChiPhi, null);
    assert.equal(so.loiNhuan, 1_080);
  });

  it("có tỷ lệ chung nhưng chưa có hạng mục thì không bịa chi phí chung", () => {
    const so = tinhSoTongQuan({ vatPercent: 8, thanhTien: [], tyLeChungBps: [300], tienDonHang: 100, tienCongTrinh: 50 });
    assert.equal(so.chiPhiChung, null);
    assert.equal(so.tongChiPhi, null);
    assert.equal(so.thieuChiPhi, "Chưa có doanh thu sau thuế để tính chi phí chung");
    assert.equal(so.loiNhuan, null);
  });

  it("cộng chi phí chung trên doanh thu sau thuế, đơn hàng và chi phí công trình", () => {
    const so = tinhSoTongQuan({ vatPercent: 8, thanhTien: [1_000_000], tyLeChungBps: [250, 100], tienDonHang: 200_000, tienCongTrinh: 50_000 });
    assert.equal(so.truocThue, 1_000_000);
    assert.equal(so.sauThue, 1_080_000);
    assert.equal(so.chiPhiChung, 37_800);
    assert.equal(so.tienDonHang, 200_000);
    assert.equal(so.tienCongTrinh, 50_000);
    assert.equal(so.tongChiPhi, 287_800);
    assert.equal(so.loiNhuan, 792_200);
  });

  it("chưa có sau thuế thì không nhân tỷ lệ trên doanh thu trước thuế", () => {
    const so = tinhSoTongQuan({ vatPercent: null, thanhTien: [1_000_000], tyLeChungBps: [200], tienDonHang: 0, tienCongTrinh: 0 });
    assert.equal(so.chiPhiChung, null);
    assert.equal(so.tongChiPhi, null);
  });

  it("chưa có hạng mục thì không coi giá trị sau thuế là 0", () => {
    const so = tinhSoTongQuan({ vatPercent: 10, thanhTien: [], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 500 });
    assert.equal(so.sauThue, null);
    assert.equal(so.thieuSauThue, "Chưa có hạng mục");
    assert.equal(so.loiNhuan, null);
    assert.equal(so.thieuLoiNhuan, "Chưa có hạng mục");
  });

  it("chưa nhập thuế thì không ra lợi nhuận dù chi phí đã là 0", () => {
    const so = tinhSoTongQuan({ vatPercent: null, thanhTien: [100], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 0 });
    assert.equal(so.thieuLoiNhuan, "Chưa nhập thuế");
    assert.equal(so.loiNhuanRong, null);
  });

  it("thuế thu nhập bằng doanh thu sau thuế trừ đơn hàng và chi phí công trình, không gồm chi phí chung", () => {
    const so = tinhSoTongQuan({
      vatPercent: 8,
      thanhTien: [1_000_000],
      tyLeChungBps: [250, 100],
      tienDonHang: 200_000,
      tienCongTrinh: 50_000,
      thueTndnBps: 2000,
    });
    assert.equal(so.thueTndn, 166_000);
    assert.equal(so.thieuThueTndn, null);
    assert.equal(so.tongChiPhi, 287_800);
    assert.equal(so.loiNhuan, 792_200);
    assert.equal(so.loiNhuanRong, 626_200);
    assert.equal(so.ghiChuRong, GHI_CHU_DA_TRU_THUE);
  });

  it("chưa chốt thuế thu nhập thì không trừ và không coi là 0", () => {
    const so = tinhSoTongQuan({ vatPercent: 8, thanhTien: [1_000_000], tyLeChungBps: [], tienDonHang: 200_000, tienCongTrinh: 50_000, thueTndnBps: null });
    assert.equal(so.thueTndn, null);
    assert.equal(so.thieuThueTndn, "Chưa chốt thuế thu nhập doanh nghiệp");
    assert.equal(so.tongChiPhi, 250_000);
    assert.equal(so.loiNhuan, 830_000);
    assert.equal(so.loiNhuanRong, null);
    assert.equal(so.ghiChuRong, GHI_CHU_LOI_NHUAN_RONG);
  });

  it("lợi nhuận âm khi chi phí lớn hơn giá trị sau thuế", () => {
    const so = tinhSoTongQuan({ vatPercent: 10, thanhTien: [1_000], tyLeChungBps: [], tienDonHang: 0, tienCongTrinh: 2_000 });
    assert.equal(so.loiNhuan, -900);
    assert.equal(so.loiNhuanRong, null);
  });
});
