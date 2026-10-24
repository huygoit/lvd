export const measureUnits = [
  "bộ",
  "cái",
  "chiếc",
  "cây",
  "thanh",
  "tấm",
  "kg",
  "gr",
  "m",
  "m2",
  "m3",
  "chai",
  "bình",
  "bịch",
  "bị",
  "hộp",
  "gói",
  "thùng",
  "túi",
  "cuộn",
  "lon",
  "tuýp",
  "ống",
  "lít",
  "cặp",
  "đôi",
  "con",
  "set",
  "vòng",
  "lô",
  "xấp",
  "mẫu",
  "lỗ",
  "góc",
  "khung",
  "máy",
  "md",
] as const;

export type MeasureUnit = (typeof measureUnits)[number];

const aliases: Record<string, MeasureUnit> = {
  mét: "m",
  met: "m",
};

export function isMeasureUnit(value: string): value is MeasureUnit {
  return (measureUnits as readonly string[]).includes(value);
}

export function canonMeasureUnit(value: string): MeasureUnit | null {
  const raw = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
  const unit = aliases[raw] ?? raw;
  return isMeasureUnit(unit) ? unit : null;
}
