import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTax, areaFromSizeMilli, priceItem } from "@/modules/quotations/calc";
import { readVnd } from "@/shared/lib/vnd-words";

const base = {
  name: "Cửa đi",
  quantity: 2,
  mainUnitPrice: 100_000,
};

describe("tính tiền báo giá", () => {
  it("thiếu kích thước thì tính theo bộ", () => {
    const line = priceItem(base);
    assert.equal(line.calcMethod, "bo");
    assert.equal(line.pretax, 200_000);
    assert.equal(line.areaMilli, 0);
  });

  it("không cần nội dung vẫn tính được thành tiền khi gõ", () => {
    const line = priceItem({ name: "", quantity: 0, mainUnitPrice: 2_000_000, areaOverride: 3.5 });
    assert.equal(line.pretax, 7_000_000);
  });

  it("có đủ rộng và cao thì tính khối lượng m² rồi nhân đơn giá", () => {
    const line = priceItem({
      ...base,
      quantity: 6,
      widthMm: 1600,
      heightMm: 2400,
      mainUnitPrice: 2_200_000,
    });
    assert.equal(line.calcMethod, "dien_tich");
    assert.equal(line.areaMilli, areaFromSizeMilli(1600, 2400, 6));
    assert.equal(line.pretax, 50_688_000);
  });

  it("nhập khối lượng tay thì thành tiền = khối lượng × đơn giá, không cần số lượng", () => {
    const line = priceItem({
      ...base,
      widthMm: 1600,
      heightMm: 2400,
      areaOverride: 10,
      mainUnitPrice: 1_000_000,
      quantity: 0,
    });
    assert.equal(line.calcMethod, "dien_tich");
    assert.equal(line.areaMilli, 10_000);
    assert.equal(line.pretax, 10_000_000);
  });

  it("chỉ một cạnh thì vẫn tính theo bộ", () => {
    const line = priceItem({ ...base, widthMm: 1600, heightMm: null });
    assert.equal(line.calcMethod, "bo");
    assert.equal(line.pretax, 200_000);
  });

  it("thuế một suất trên tổng tiền hàng", () => {
    const taxed = applyTax(50_688_000, 1000);
    assert.equal(taxed.tax, 5_068_800);
    assert.equal(taxed.posttax, 55_756_800);
    assert.equal(taxed.retail, false);
    const zero = applyTax(12_000_000, 0);
    assert.equal(zero.retail, false);
    assert.equal(zero.tax, 0);
    assert.equal(zero.posttax, 12_000_000);
    const retail = applyTax(12_000_000, -1);
    assert.equal(retail.retail, true);
    assert.equal(retail.tax, 0);
    assert.equal(retail.posttax, 12_000_000);
  });

  it("từ chối số lượng âm", () => {
    assert.throws(() => priceItem({ ...base, quantity: -1 }), /Số lượng/);
  });
});

describe("đọc số tiền", () => {
  it("đọc theo lối chứng từ", () => {
    assert.equal(readVnd(0), "Không đồng chẵn");
    assert.equal(readVnd(15), "Mười lăm đồng chẵn");
    assert.equal(readVnd(21), "Hai mươi mốt đồng chẵn");
    assert.equal(readVnd(1_001), "Một nghìn không trăm lẻ một đồng chẵn");
    assert.equal(readVnd(71_688_000), "Bảy mươi mốt triệu sáu trăm tám mươi tám nghìn đồng chẵn");
  });
});
