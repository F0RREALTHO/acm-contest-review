import { HackerRankClient } from "../src/services/hackerrank-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const client = new HackerRankClient({ cookie: settings?.cookie || "", delayMs: 100 });
  
  try {
    const url = "https://www.hackerrank.com/rest/contests/acm-mirror-challenge-2026/leaderboard?offset=0&limit=10";
    console.log("Fetching:", url);
    const res = await (client as any).fetchWithRetry(url);
    const json = await res.json();
    console.log("Leaderboard data:");
    console.log(JSON.stringify(json.models.slice(0, 2), null, 2));
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
