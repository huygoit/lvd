import type { User } from "@/shared/auth/types";
import { hasCapability } from "@/shared/auth/types";
import { AppError } from "@/shared/errors";

const adminKeys = ["adminUnitPrice", "declaredAdminTotal"];

export function seesAdminPrice(user: User) {
  return hasCapability(user, "contracts.prices.admin");
}

export function rejectAdminPayload(user: User, body: Record<string, unknown>) {
  if (seesAdminPrice(user)) return;
  for (const key of adminKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw new AppError("Bạn không có quyền ghi giá quản trị.", 403);
    }
  }
}
