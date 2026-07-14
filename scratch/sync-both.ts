import { PrismaClient } from "@prisma/client";
import { SyncEngine } from "../src/services/sync-engine";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings || !settings.cookie) {
    console.error("No cookie found in settings");
    return;
  }
  
  for (const slug of ["acm-summer-challenge-2026", "acm-mirror-challenge-2026"]) {
    console.log(`Syncing ${slug}...`);
    const engine = new SyncEngine({ contestSlug: slug, cookie: settings.cookie, fullSync: true });
    try {
      const result = await engine.run(true);
      console.log(`Finished ${slug}: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error(`Failed ${slug}:`, e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
