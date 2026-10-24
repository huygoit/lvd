"use client";

import { Field, selectClass } from "@/shared/components/controls";

export function JobTitleField({
  name,
  label,
  titles,
  value = "",
}: {
  name: string;
  label: string;
  titles: string[];
  value?: string;
}) {
  const current = value.trim();
  const known = titles.some((item) => item.toLocaleLowerCase("vi") === current.toLocaleLowerCase("vi"));
  const options = current && !known ? [current, ...titles] : titles;
  return (
    <Field label={label} hint={options.length === 0 ? "Chưa có chức danh trong danh mục." : undefined}>
      <select name={name} defaultValue={current} className={selectClass} aria-label={label}>
        <option value="">Chưa chọn</option>
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </Field>
  );
}
