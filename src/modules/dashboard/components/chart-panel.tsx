"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCount } from "@/shared/lib/money";
import type { ChartView } from "@/modules/dashboard/types";

export function ChartPanel({ charts }: { charts: ChartView[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {charts.map((chart) => (
        <article key={chart.id} className="rounded-[18px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold text-ink">{chart.title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">{chart.question}</p>
          {chart.empty ? (
            <p className="mt-8 text-sm text-muted">{chart.summary}</p>
          ) : (
            <div className="mt-4 h-64" role="img" aria-label={chart.summary}>
              <ResponsiveContainer width="100%" height="100%">
                {chart.kind === "donut" ? (
                  <PieChart>
                    <Pie data={chart.points} dataKey="value" nameKey="label" innerRadius={58} outerRadius={82} paddingAngle={2}>
                      {chart.points.map((point) => (
                        <Cell key={point.label} fill={point.color ?? "#1D4ED8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${formatCount(Number(value))} ${chart.unitLabel}`, "Số lượng"]} />
                  </PieChart>
                ) : (
                  <BarChart data={chart.points} layout={chart.kind === "bar" ? "vertical" : "horizontal"} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" vertical={chart.kind !== "bar"} />
                    {chart.kind === "bar" ? (
                      <>
                        <XAxis type="number" allowDecimals={false} stroke="#64748B" fontSize={12} />
                        <YAxis type="category" dataKey="label" width={108} stroke="#64748B" fontSize={12} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
                        <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} />
                      </>
                    )}
                    <Tooltip formatter={(value) => [`${formatCount(Number(value))} ${chart.unitLabel}`, "Số lượng"]} />
                    <Bar dataKey="value" fill="#1D4ED8" radius={4} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
          <table className="sr-only">
            <caption>{chart.title}</caption>
            <tbody>
              {chart.points.map((point) => (
                <tr key={point.label}>
                  <th scope="row">{point.label}</th>
                  <td>
                    {formatCount(point.value)} {chart.unitLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </div>
  );
}
