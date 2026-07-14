import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generatePaginationParams } from "@/lib/utils";

export class SubmissionService {
  async getSubmissions(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: string;
    userId?: string;
    problemId?: string;
    week?: number;
    language?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const { skip, take } = generatePaginationParams(page, limit);

    const where: Prisma.SubmissionWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.userId) where.userId = params.userId;
    if (params.problemId) where.problemId = params.problemId;
    if (params.week) where.problem = { week: params.week };
    if (params.language) where.language = params.language;
    if (params.search) {
      where.OR = [
        { submissionId: { contains: params.search } },
        { user: { username: { contains: params.search } } },
        { problem: { name: { contains: params.search } } },
      ];
    }

    const orderBy: Prisma.SubmissionOrderByWithRelationInput = {};
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    if (sortBy === "username") {
      orderBy.user = { username: sortOrder };
    } else if (sortBy === "problemName") {
      orderBy.problem = { name: sortOrder };
    } else {
      (orderBy as Record<string, string>)[sortBy] = sortOrder;
    }

    const [data, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          user: { select: { username: true, team: true } },
          problem: { select: { name: true, slug: true, week: true } },
          review: {
            select: {
              reviewed: true,
              flagged: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + data.length < total,
    };
  }

  async getSubmissionById(submissionId: string) {
    const sub = await prisma.submission.findUnique({
      where: { submissionId },
      include: {
        user: { select: { username: true, team: true } },
        problem: { select: { name: true, slug: true, week: true } },
        review: true,
        sourceCache: true,
      },
    });

    if (!sub) return null;

    return {
      ...sub,
      sourceCode: sub.sourceCache?.sourceCode || null,
      downloadStatus: sub.sourceCache?.status || "PENDING",
    };
  }

  async getSubmissionHistory(userId: string, problemId: string) {
    return prisma.submission.findMany({
      where: { userId, problemId },
      include: {
        problem: { select: { name: true, slug: true, week: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const submissionService = new SubmissionService();
