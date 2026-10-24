import type { Capability, User } from "@/shared/auth/types";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { AppError } from "@/shared/errors";

export function assertAny(user: User, capabilities: Capability[]) {
  if (!hasAnyCapability(user, capabilities)) {
    throw new AppError("Bạn không có quyền thực hiện thao tác này.", 403);
  }
}

export function assertOwn(user: User, all: Capability, assigned: Capability, ownerId: string) {
  if (hasCapability(user, all)) return;
  if (hasCapability(user, assigned) && ownerId === user.id) return;
  throw new AppError("Bạn không có quyền xem bản ghi này.", 403);
}

export function listOwner(user: User, all: Capability, assigned: Capability) {
  if (hasCapability(user, all)) return undefined;
  if (hasCapability(user, assigned)) return user.id;
  throw new AppError("Bạn không có quyền xem danh sách này.", 403);
}
