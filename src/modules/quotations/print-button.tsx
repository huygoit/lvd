"use client";

export function PrintButton() {
  return (
    <button type="button" className="no-print rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
      In hoặc lưu PDF
    </button>
  );
}
