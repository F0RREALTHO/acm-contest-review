import { prisma } from "@/lib/prisma";
import { getLatestAcceptedSubmissions } from "@/lib/computed-queries";
import type { ReviewDashboardStats } from "@/types/database";

export class ReviewService {
  async createOrUpdateReview(data: {
    submissionId: string;
    reviewed?: boolean;
    flagged?: boolean;
    reason?: string;
    notes?: string;
  }) {
    return prisma.review.upsert({
      where: { submissionId: data.submissionId },
      update: {
        reviewed: data.reviewed ?? false,
        flagged: data.flagged ?? false,
        reason: data.reason || null,
        notes: data.notes || null,
        reviewedAt: data.reviewed ? new Date() : null,
      },
      create: {
        submissionId: data.submissionId,
        reviewed: data.reviewed ?? false,
        flagged: data.flagged ?? false,
        reason: data.reason || null,
        notes: data.notes || null,
        reviewedAt: data.reviewed ? new Date() : null,
      },
    });
  }

  async getReviewQueue(params: {
    week?: number;
    page?: number;
    limit?: number;
  }) {
    const latestAccepted = await getLatestAcceptedSubmissions({
      week: params.week,
      reviewed: false,
    });

    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const paged = latestAccepted.slice(start, start + limit);

    return {
      data: paged,
      total: latestAccepted.length,
      page,
      limit,
      totalPages: Math.ceil(latestAccepted.length / limit),
      hasMore: start + paged.length < latestAccepted.length,
    };
  }

  async getNextUnreviewed(currentSubmissionId?: string, week?: number) {
    const queue = await getLatestAcceptedSubmissions({
      week,
      reviewed: false,
    });

    if (queue.length === 0) return null;

    if (!currentSubmissionId) return queue[0];

    const currentIndex = queue.findIndex(
      (s) => s.submissionId === currentSubmissionId
    );

    if (currentIndex === -1 || currentIndex >= queue.length - 1) {
      return queue[0]; // Wrap around
    }

    return queue[currentIndex + 1];
  }

  async getPreviousUnreviewed(currentSubmissionId: string, week?: number) {
    const queue = await getLatestAcceptedSubmissions({
      week,
      reviewed: false,
    });

    if (queue.length === 0) return null;

    const currentIndex = queue.findIndex(
      (s) => s.submissionId === currentSubmissionId
    );

    if (currentIndex <= 0) {
      return queue[queue.length - 1]; // Wrap around
    }

    return queue[currentIndex - 1];
  }

  async getDashboardStats(week?: number): Promise<ReviewDashboardStats> {
    const latestAccepted = await getLatestAcceptedSubmissions({ week });
    const totalToReview = latestAccepted.length;
    const reviewed = latestAccepted.filter((s) => s.review?.reviewed);
    const flagged = latestAccepted.filter((s) => s.review?.flagged);

    // Reviewed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewedToday = await prisma.review.count({
      where: {
        reviewed: true,
        reviewedAt: { gte: today },
      },
    });

    return {
      pendingReviews: totalToReview - reviewed.length,
      reviewedToday,
      flaggedSolutions: flagged.length,
      totalToReview,
      reviewProgress: totalToReview > 0
        ? (reviewed.length / totalToReview) * 100
        : 100,
    };
  }

  async getReviews(params: {
    reviewed?: boolean;
    flagged?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;

    const where: Record<string, unknown> = {};
    if (params.reviewed !== undefined) where.reviewed = params.reviewed;
    if (params.flagged !== undefined) where.flagged = params.flagged;

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          submission: {
            include: {
              user: { select: { username: true } },
              problem: { select: { name: true, slug: true, week: true, contest: { select: { slug: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: (page - 1) * limit + data.length < total,
    };
  }
}

export const reviewService = new ReviewService();
