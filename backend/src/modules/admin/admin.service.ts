import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanType } from '@prisma/client';

const PRICES: Record<string, number> = {
  PRO: 16900,
  EMPRESA: 34900,
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [total, byPlan, newLast30] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['plan', 'planGrantedByAdmin'],
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const planCount: Record<string, number> = { FREE: 0, PRO: 0, EMPRESA: 0 };
    const paidCount: Record<string, number> = { PRO: 0, EMPRESA: 0 };
    const grantedCount: Record<string, number> = { PRO: 0, EMPRESA: 0 };

    for (const row of byPlan) {
      const plan = row.plan as string;
      const count = row._count.id;
      planCount[plan] = (planCount[plan] ?? 0) + count;
      if (plan !== 'FREE') {
        if (row.planGrantedByAdmin) grantedCount[plan] = (grantedCount[plan] ?? 0) + count;
        else paidCount[plan] = (paidCount[plan] ?? 0) + count;
      }
    }

    const mrr = (paidCount.PRO ?? 0) * PRICES.PRO + (paidCount.EMPRESA ?? 0) * PRICES.EMPRESA;
    const mrrLost = (grantedCount.PRO ?? 0) * PRICES.PRO + (grantedCount.EMPRESA ?? 0) * PRICES.EMPRESA;

    return {
      totalUsers: total,
      byPlan: planCount,
      paidPlans: paidCount,
      grantedPlans: grantedCount,
      mrr,
      mrrLost,
      newUsersLast30Days: newLast30,
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isStaff: true,
        planGrantedByAdmin: true,
        createdAt: true,
        _count: { select: { businesses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changePlan(adminId: string, userId: string, plan: PlanType, note?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          planGrantedByAdmin: plan !== 'FREE',
          planStartedAt: plan !== 'FREE' ? new Date() : null,
        },
        select: { id: true, email: true, name: true, plan: true, isStaff: true, planGrantedByAdmin: true },
      }),
      this.prisma.planHistory.create({
        data: {
          userId,
          fromPlan: user.plan,
          toPlan: plan,
          changedById: adminId,
          grantedByAdmin: true,
          note: note ?? null,
        },
      }),
    ]);

    return updated;
  }

  async toggleStaff(adminId: string, userId: string, isStaff: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, isStaff: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const data: Record<string, unknown> = { isStaff };
    const historyEntries: Array<{ fromPlan: PlanType; toPlan: PlanType; note: string }> = [];

    if (isStaff && user.plan === 'FREE') {
      data.plan = 'EMPRESA';
      data.planGrantedByAdmin = true;
      data.planStartedAt = new Date();
      historyEntries.push({ fromPlan: 'FREE', toPlan: 'EMPRESA', note: 'Activado como staff por admin' });
    }

    if (!isStaff && user.plan !== 'FREE') {
      data.plan = 'FREE';
      data.planGrantedByAdmin = false;
      data.planStartedAt = null;
      historyEntries.push({ fromPlan: user.plan, toPlan: 'FREE', note: 'Staff desactivado por admin' });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, plan: true, isStaff: true, planGrantedByAdmin: true },
    });

    if (historyEntries.length > 0) {
      await this.prisma.planHistory.createMany({
        data: historyEntries.map(e => ({
          userId,
          fromPlan: e.fromPlan,
          toPlan: e.toPlan,
          changedById: adminId,
          grantedByAdmin: true,
          note: e.note,
        })),
      });
    }

    return updated;
  }

  async getUserHistory(userId: string) {
    return this.prisma.planHistory.findMany({
      where: { userId },
      include: {
        changedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGlobalHistory(page = 1, limit = 50, userId?: string) {
    const where = userId ? { userId } : {};
    const [total, items] = await Promise.all([
      this.prisma.planHistory.count({ where }),
      this.prisma.planHistory.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          changedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, page, limit, items };
  }
}
