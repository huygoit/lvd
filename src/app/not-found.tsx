import Link from "next/link";
import { routes } from "@/shared/config/routes";

export default function NotFound() {
  return (
    <main className="grid min-h-full place-items-center bg-page px-4">
      <div className="max-w-md rounded-[18px] border border-line bg-white p-6">
        <h1 className="text-xl font-semibold text-ink">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-muted">Đường dẫn này không có trong phần đang triển khai.</p>
        <Link href={routes.home} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
          Về Tổng quan
        </Link>
      </div>
    </main>
  );
}
