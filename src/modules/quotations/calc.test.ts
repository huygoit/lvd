import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTax, priceItem } from "@/modules/quotations/calc";
import { readVnd } from "@/shared/lib/vnd-words";

const base = {
  groupKey: "cua_nhom_kinh",
  name: "Cửa đi",
  quantity: 2,
  mainUnitPrice: 100_000,
  accessoryUnitPrice: 0,
};

describe("tính tiền báo giá", () => {
  it("thiếu kích thước thì cộng đơn giá cửa và phụ kiện theo bộ", () => {
    const line = priceItem({ ...base, accessoryUnitPrice: 50_000 });
    assert.equal(line.calcMethod, "bo");
    assert.equal(line.pretax, 300_000);
    assert.equal(line.accessoryAmount, 100_000);
  });

  it("có đủ rộng và cao thì tính m² rồi cộng phụ kiện theo bộ", () => {
    const line = priceItem({
      ...base,
      quantity: 6,
      widthMm: 1600,
      heightMm: 2400,
      mainUnitPrice: 2_200_000,
      accessoryUnitPrice: 3_500_000,
    });
    assert.equal(line.calcMethod, "dien_tich");
    assert.equal(line.pretax, 71_688_000);
  });

  it("chỉ một cạnh thì vẫn tính theo bộ", () => {
    const line = priceItem({ ...base, widthMm: 1600, heightMm: null, accessoryUnitPrice: 10_000 });
    assert.equal(line.calcMethod, "bo");
    assert.equal(line.pretax, 220_000);
  });

  it("thuế một suất trên tổng tiền hàng", () => {
    const taxed = applyTax(71_688_000, 1000);
    assert.equal(taxed.tax, 7_168_800);
    assert.equal(taxed.posttax, 78_856_800);
    const retail = applyTax(12_000_000, 0);
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
