import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";

export type StaffOrgRow = {
  id: string;
  name: string;
  active: boolean;
  departmentId: string;
  positionId: string;
};

export async function listStaffOrg() {
  const rows = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true, departmentId: true, positionId: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: row.active,
    departmentId: row.departmentId ?? "",
    positionId: row.positionId ?? "",
  }));
}

export async function assignStaffOrg(
  user: User,
  staffId: string,
  patch: { departmentId?: string; positionId?: string },
) {
  assertAny(user, ["settings.manage"]);
  await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new AppError("Không tìm thấy nhân sự.", 404);
    const data: { departmentId?: string | null; positionId?: string | null } = {};
    if (patch.departmentId !== undefined) {
      const id = patch.departmentId.trim();
      if (id) {
        const department = await tx.department.findUnique({ where: { id } });
        if (!department) throw new AppError("Phòng ban không còn trong danh mục.", 400);
        if (!department.active && staff.departmentId !== department.id) throw new AppError("Phòng ban này đã ngừng dùng.", 400);
      }
      data.departmentId = id || null;
    }
    if (patch.positionId !== undefined) {
      const id = patch.positionId.trim();
      if (id) {
        const position = await tx.position.findUnique({ where: { id } });
        if (!position) throw new AppError("Chức vụ không còn trong danh mục.", 400);
        if (!position.active && staff.positionId !== position.id) throw new AppError("Chức vụ này đã ngừng dùng.", 400);
      }
      data.positionId = id || null;
    }
    if (Object.keys(data).length === 0) return;
    await tx.staff.update({ where: { id: staffId }, data });
    await writeAudit(tx, user.id, "sua", "nhan_su", staffId, `Cập nhật phòng ban hoặc chức vụ của ${staff.name}`);
  });
  return listStaffOrg();
}
