import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "@/shared/errors";
import { parseRoles } from "@/modules/partners/roles";

describe("vai trò đối tác", () => {
  it("một đối tác giữ nhiều vai trò và sắp theo thứ tự cố định", () => {
    assert.deepEqual(parseRoles(["van_tai", "nha_cung_cap", "van_tai"]), ["nha_cung_cap", "van_tai"]);
  });

  it("thiếu vai trò thì không lưu", () => {
    assert.throws(() => parseRoles([]), (error: unknown) => error instanceof AppError && error.message === "Chọn ít nhất một vai trò.");
  });

  it("vai trò lạ thì không lưu", () => {
    assert.throws(() => parseRoles(["khach_hang"]), (error: unknown) => error instanceof AppError && error.status === 400);
  });
});
