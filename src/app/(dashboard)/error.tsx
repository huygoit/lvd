"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">Không tải được màn hình này</h1>
      <p className="mt-2 text-sm text-muted">Dữ liệu đang mở không được giữ lại. Bạn có thể thử lại.</p>
      <button type="button" onClick={reset} className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white">
        Thử lại
      </button>
    </div>
  );
}
