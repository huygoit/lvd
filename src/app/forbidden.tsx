import Link from "next/link";
import { routes } from "@/shared/config/routes";

export default function Forbidden() {
  return (
    <main className="grid min-h-full place-items-center bg-page px-4">
      <div className="max-w-md rounded-[18px] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-ink">Bạn không có quyền xem mục này</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Tài khoản hiện tại không được cấp quyền tương ứng. Dữ liệu của mục này không được gửi xuống trình duyệt.
        </p>
        <Link
          href={routes.home}
          className="mt-5 inline-flex min-h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white"
        >
          Về Tổng quan
        </Link>
      </div>
    </main>
  );
}
