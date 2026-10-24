import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rejectAdminPayload } from "@/modules/contracts/guard";
import { controlWarning, leafLines, linePretax, placementError, sumLeaves } from "@/modules/contracts/money";
import { currentQuantity, fabricationOver } from "@/modules/contracts/quantity";
import { AppError } from "@/shared/errors";
import type { User } from "@/shared/auth/types";

const sales = { id: "ha", capabilities: ["contracts.view.assigned"] } as User;

describe("tiền phạm vi hợp đồng", () => {
  it("thiếu đơn giá thì không thành 0", () => {
    assert.equal(linePretax(2, null, null, null), null);
    assert.equal(linePretax(0, 1000, null, null), 0);
  });

  it("không cộng cả cha và con", () => {
    const lines = [
      { id: "nha", parentId: null, kind: "nha", quantity: 1, signedUnitPrice: 9_000, adminUnitPrice: null, widthMm: null, heightMm: null, taxBps: null },
      { id: "cua", parentId: "nha", kind: "ky_hieu", quantity: 2, signedUnitPrice: 1_000, adminUnitPrice: null, widthMm: null, heightMm: null, taxBps: null },
    ];
    assert.equal(leafLines(lines).map((line) => line.id).join(), "cua");
    assert.equal(sumLeaves(lines, "signedUnitPrice"), 2_000);
  });

  it("bộ chưa có giá thì không cộng trùng với ký hiệu", () => {
    const lines = [
      { id: "cua", parentId: null, kind: "ky_hieu", quantity: 2, signedUnitPrice: 1_000, adminUnitPrice: null, widthMm: null, heightMm: null, taxBps: null },
      { id: "bo1", parentId: "cua", kind: "bo", quantity: 1, signedUnitPrice: null, adminUnitPrice: null, widthMm: null, heightMm: null, taxBps: null },
    ];
    assert.equal(sumLeaves(lines, "signedUnitPrice"), 2_000);
  });

  it("bộ chỉ đứng dưới ký hiệu cửa", () => {
    assert.equal(placementError("bo", "ky_hieu"), null);
    assert.match(placementError("bo", "nha") ?? "", /ký hiệu/);
    assert.equal(placementError("diem", null), null);
  });

  it("lệch tổng khai báo thì cảnh báo, không bịa dòng bù", () => {
    assert.match(controlWarning(8_960_000_000, 6_000_000_000) ?? "", /không tự thêm/);
    assert.equal(controlWarning(null, 100), null);
  });
});

describe("khối lượng", () => {
  it("100 đã giao 60 thêm 50 thì vượt 10", () => {
    assert.equal(fabricationOver(100, 60, 50).over, 10);
  });

  it("chưa có số gốc thì hiện hành vẫn chưa có", () => {
    assert.equal(currentQuantity(null, [2]), null);
    assert.equal(currentQuantity(4, [1, -2]), 3);
  });
});

describe("giá quản trị", () => {
  it("payload có trường quản trị thì từ chối khi không có quyền", () => {
    assert.throws(() => rejectAdminPayload(sales, { adminUnitPrice: 1 }), (error: unknown) => error instanceof AppError && error.status === 403);
    assert.doesNotThrow(() => rejectAdminPayload(sales, { signedUnitPrice: 1 }));
  });
});
