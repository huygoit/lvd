import { redirect } from "next/navigation";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const khach = one(query.khach);
  const params = new URLSearchParams({ mo: "them" });
  if (khach) params.set("khach", khach);
  redirect(`/cong-trinh?${params.toString()}`);
}
