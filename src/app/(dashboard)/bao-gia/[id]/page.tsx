import { redirect } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const version = Array.isArray(query.v) ? query.v[0] ?? "" : query.v ?? "";
  const target = new URLSearchParams({ mo: "sua", id });
  if (version) target.set("v", version);
  redirect(`/bao-gia?${target.toString()}`);
}
