import { createBackup, listBackups } from "@/modules/system/backup";
import { actor, run } from "@/shared/http";

export async function GET() {
  return run(async () => {
    const user = await actor();
    return { backups: await listBackups(user) };
  });
}

export async function POST() {
  return run(async () => {
    const user = await actor();
    return createBackup(user);
  });
}
