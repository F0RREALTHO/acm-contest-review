import { prisma } from "@/lib/prisma";
import type { SearchResults } from "@/types/api";

export class SearchService {
  async search(query: string, limit = 10): Promise<SearchResults> {
    if (!query || query.trim().length === 0) {
      return { participants: [], problems: [], submissions: [] };
    }

    const searchTerm = query.trim();

    const [participants, problems, submissions] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: searchTerm } },
            { team: { contains: searchTerm } },
          ],
        },
        select: {
          username: true,
          team: true,
          _count: { select: { submissions: { where: { status: "Accepted" } } } },
        },
        take: limit,
      }),

      prisma.problem.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { slug: { contains: searchTerm } },
          ],
        },
        select: {
          name: true,
          slug: true,
          week: true,
        },
        take: limit,
      }),

      prisma.submission.findMany({
        where: {
          OR: [
            { submissionId: { contains: searchTerm } },
            { user: { username: { contains: searchTerm } } },
            { problem: { name: { contains: searchTerm } } },
            { language: { contains: searchTerm } },
            { status: { contains: searchTerm } },
          ],
        },
        include: {
          user: { select: { username: true } },
          problem: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return {
      participants: participants.map((p) => ({
        username: p.username,
        team: p.team,
        problemsSolved: p._count.submissions,
      })),
      problems: problems.map((p) => ({
        name: p.name,
        slug: p.slug,
        week: p.week,
      })),
      submissions: submissions.map((s) => ({
        submissionId: s.submissionId,
        username: s.user.username,
        problemName: s.problem.name,
        status: s.status,
        language: s.language,
        createdAt: s.createdAt,
      })),
    };
  }
}

export const searchService = new SearchService();
