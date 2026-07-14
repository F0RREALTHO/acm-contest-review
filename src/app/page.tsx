import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  const firstContest = await prisma.contest.findFirst({
    where: { enabled: true },
    orderBy: { displayOrder: "asc" },
    select: { slug: true },
  });

  if (firstContest) {
    redirect(`/contests/${firstContest.slug}`);
  }

  redirect("/settings");
}
