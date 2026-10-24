import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { panelClass } from "@/shared/components/controls";
import { routes } from "@/shared/config/routes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

export const metadata: Metadata = { title: "Cài đặt" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải cài đặt...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Cài đặt</h1>
        <p className="mt-1 text-sm text-muted">Chỉ tài khoản quản trị hệ thống. Danh mục dùng chung.</p>
      </div>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Chức năng</TableHead>
              <TableHead>Nội dung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <Link href={routes.backup} className="font-semibold text-primary">Sao lưu và khôi phục</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Dump PostgreSQL kèm tệp đính kèm, lưu trên máy chủ. Xem danh sách, tải về, khôi phục hoặc xóa từng bản.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.quoteCategories} className="font-semibold text-primary">Hạng mục báo giá</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Thêm, đổi tên, kéo thả thứ tự hoặc ngừng dùng nội dung mẫu trên báo giá.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.jobTitles} className="font-semibold text-primary">Chức danh</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Gõ thẳng trên bảng chức danh của người đại diện và người liên hệ.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.departments} className="font-semibold text-primary">Phòng ban</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Gõ thẳng trên bảng phòng ban, rồi chọn phòng cho nhân sự.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.positions} className="font-semibold text-primary">Chức vụ</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Gõ thẳng trên bảng chức vụ nội bộ, rồi chọn chức vụ cho nhân sự.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.employees} className="font-semibold text-primary">Nhân viên</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Hồ sơ người trong công ty, mở bằng sheet. Gắn phòng ban và chức vụ, điện thoại, email.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.roles} className="font-semibold text-primary">Vai trò và quyền</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Tạo vai trò và chọn quyền trong từng nhóm. Gán người dùng vào vai trò.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Link href={routes.users} className="font-semibold text-primary">Người dùng</Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted">Tạo tài khoản, mật khẩu và gán vai trò. Quyền là hợp của các vai trò đang dùng.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
