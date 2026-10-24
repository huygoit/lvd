import { isYmd } from "@/shared/lib/dates";
import { AppError } from "@/shared/errors";

export const costCategoryLabel = {
  an_o: "Ăn ở",
  di_lai: "Đi lại",
  sieu_thi: "Siêu thị",
  thuoc: "Thuốc",
  nuoc: "Nước",
  boc_xep: "Bốc xếp",
  xa: "Công trình xa",
  khac: "Khác",
} as const;

export type CostCategory = keyof typeof costCategoryLabel;

const categories = Object.keys(costCategoryLabel);

export function parseCostCategory(value: unknown): CostCategory {
  const text = String(value ?? "").trim();
  if (!categories.includes(text)) throw new AppError("Chọn nhóm chi phí.", 400);
  return text as CostCategory;
}

export function parseCostAmount(value: unknown) {
  const digits = String(value ?? "").trim();
  if (!digits) throw new AppError("Cần nhập số tiền.", 400);
  if (!/^\d{1,15}$/.test(digits) || digits === "0") throw new AppError("Số tiền phải là số nguyên dương.", 400);
  const amount = BigInt(digits);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new AppError("Số tiền quá lớn.", 400);
  return amount;
}

export function parseCostDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!isYmd(text)) throw new AppError("Ngày chi không hợp lệ.", 400);
  return text;
}

function ngaySo(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function nghiTrungNhau(
  left: { occurredOn: string; content: string; amount: bigint },
  right: { occurredOn: string; content: string; amount: bigint },
) {
  if (!isYmd(left.occurredOn) || !isYmd(right.occurredOn)) return false;
  if (Math.abs(ngaySo(left.occurredOn) - ngaySo(right.occurredOn)) > 3 * 86400000) return false;
  const cungNoiDung = left.content.trim().toLocaleLowerCase("vi") === right.content.trim().toLocaleLowerCase("vi");
  return left.amount === right.amount || cungNoiDung;
}
