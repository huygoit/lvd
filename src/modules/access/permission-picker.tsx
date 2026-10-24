"use client";

import { useMemo, useState } from "react";
import type { Capability } from "@/shared/auth/types";
import { permissionGroups } from "@/shared/auth/permissions";
import { inputClass } from "@/shared/components/controls";

export function PermissionPicker({
  selected,
  onChange,
}: {
  selected: Capability[];
  onChange: (next: Capability[]) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("vi-VN");
  const chosen = useMemo(() => new Set(selected), [selected]);

  function toggle(id: Capability) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  function toggleGroup(ids: Capability[], on: boolean) {
    const next = new Set(chosen);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  }

  const groups = permissionGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!needle) return true;
        return `${item.label} ${item.hint ?? ""}`.toLocaleLowerCase("vi-VN").includes(needle);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lọc quyền" className={inputClass} />
      <p className="text-xs text-muted">Đã chọn {selected.length} quyền. Quyền có hiệu lực là hợp của mọi vai trò đang dùng.</p>
      {groups.length === 0 ? <p className="text-sm text-muted">Không có quyền khớp từ khóa.</p> : null}
      {groups.map((group) => {
        const ids = group.items.map((item) => item.id);
        const count = ids.filter((id) => chosen.has(id)).length;
        const all = count === ids.length;
        return (
          <section key={group.id} className="rounded-[14px] border border-line">
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
              <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={() => toggleGroup(ids, !all)}
                />
                {count}/{ids.length}
              </label>
            </div>
            <div className="grid gap-1 p-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <label key={item.id} className="flex items-start gap-2 rounded-[10px] px-2 py-1.5 hover:bg-soft">
                  <input type="checkbox" className="mt-1" checked={chosen.has(item.id)} onChange={() => toggle(item.id)} />
                  <span>
                    <span className="block text-sm text-ink">{item.label}</span>
                    {item.hint ? <span className="block text-xs text-muted">{item.hint}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
