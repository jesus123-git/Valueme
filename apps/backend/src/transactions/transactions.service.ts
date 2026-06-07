import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  // ─── Crear transacción empresarial ────────────────────────────────────────────

  async create(userId: string, businessId: string, dto: CreateTransactionDto) {
    await this.businessesService.findOne(userId, businessId);

    return this.prisma.transaction.create({
      data: {
        ...dto,
        amount: dto.amount,
        date: new Date(dto.date),
        businessId,
        owner: 'BUSINESS',
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
  }

  // ─── Listar transacciones de una empresa con filtros ─────────────────────────

  async findAll(userId: string, businessId: string, filters: FilterTransactionDto) {
    await this.businessesService.findOne(userId, businessId);

    const where: any = { businessId };

    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    // Totales del período
    const totals = transactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount);
        if (t.type === 'INCOME') acc.income += amount;
        if (t.type === 'EXPENSE') acc.expenses += amount;
        return acc;
      },
      { income: 0, expenses: 0 },
    );

    return {
      transactions,
      summary: {
        ...totals,
        profit: totals.income - totals.expenses,
        count: transactions.length,
      },
    };
  }

  // ─── Obtener una transacción por ID ──────────────────────────────────────────

  async findOne(userId: string, businessId: string, transactionId: string) {
    await this.businessesService.findOne(userId, businessId);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    if (!transaction) throw new NotFoundException('Transacción no encontrada');
    if (transaction.businessId !== businessId) throw new ForbiddenException('No tienes acceso a esta transacción');

    return transaction;
  }

  // ─── Actualizar transacción ───────────────────────────────────────────────────

  async update(userId: string, businessId: string, transactionId: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, businessId, transactionId);

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
  }

  // ─── Eliminar transacción ─────────────────────────────────────────────────────

  async remove(userId: string, businessId: string, transactionId: string) {
    await this.findOne(userId, businessId, transactionId);

    return this.prisma.transaction.delete({
      where: { id: transactionId },
    });
  }

  // ─── Resumen mensual por categoría ───────────────────────────────────────────

  async getMonthlySummary(userId: string, businessId: string, year: number, month: number) {
    await this.businessesService.findOne(userId, businessId);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { businessId, date: { gte: startDate, lte: endDate } },
      include: { category: { select: { name: true, icon: true } } },
    });

    // Agrupar por categoría
    const byCategory = transactions.reduce((acc: any, t) => {
      const key = t.category?.name ?? 'Sin categoría';
      if (!acc[key]) acc[key] = { name: key, icon: t.category?.icon, income: 0, expenses: 0 };
      if (t.type === 'INCOME') acc[key].income += Number(t.amount);
      if (t.type === 'EXPENSE') acc[key].expenses += Number(t.amount);
      return acc;
    }, {});

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

    return {
      period: { year, month },
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      byCategory: Object.values(byCategory),
    };
  }
}
