import type { Capability, User } from "@/shared/auth/types";
import { defaultMembers, defaultRoles } from "@/shared/auth/role-defaults";

const profiles: Array<Pick<User, "id" | "name" | "givenName">> = [
  { id: "minh", name: "Trần Minh", givenName: "Minh" },
  { id: "ha", name: "Lê Hà", givenName: "Hà" },
  { id: "khoa", name: "Phạm Khoa", givenName: "Khoa" },
];

function defaultAccess(userId: string) {
  const roleIds = defaultMembers.filter((item) => item.userId === userId).map((item) => item.roleId);
  const roles = defaultRoles.filter((role) => roleIds.includes(role.id));
  const capabilities: Capability[] = [];
  for (const role of roles) {
    for (const capability of role.capabilities) {
      if (!capabilities.includes(capability)) capabilities.push(capability);
    }
  }
  return {
    roleLabel: roles.map((role) => role.name).join(", ") || "Chưa gán vai trò",
    capabilities,
  };
}

// Bộ quyền tĩnh này giữ cho kiểm thử và cho lần đầu khi chưa có dòng vai trò.
// Phiên làm việc đọc quyền thật từ vai trò trong cơ sở dữ liệu.
export const users: User[] = profiles.map((profile) => ({
  ...profile,
  ...defaultAccess(profile.id),
}));

export function findUser(id: string) {
  return users.find((user) => user.id === id) ?? null;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("vi-VN");
}
