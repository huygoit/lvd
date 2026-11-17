import { actor, readJson, run } from "@/shared/http";
import { getTieuChuanBaoGia, saveTieuChuanBaoGia } from "@/modules/settings/quote-standard";

export async function GET() {
  return run(async () => {
    const user = await actor();
    return getTieuChuanBaoGia(user);
  });
}

export async function PUT(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return saveTieuChuanBaoGia(user, body);
  });
}
