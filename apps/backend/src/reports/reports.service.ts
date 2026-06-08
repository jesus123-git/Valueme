import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  // ─── P&L: Ingresos vs Gastos por mes (últimos N meses) ───────────────────────

  async getProfitAndLoss(userId: string, businessId: string, months = 12) {
    await this.businessesService.findOne(userId, businessId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Ingresos de facturas pagadas por mes
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: 'PAID',
        issueDate: { gte: startDate },
      },
      select: { total: true, issueDate: true },
    });

    // Gastos de órdenes de compra pagadas por mes
    const purchases = await this.prisma.purchase.findMany({
      where: {
        businessId,
        status: 'PAID',
        issueDate: { gte: startDate },
      },
      select: { total: true, issueDate: true },
    });

    // Gastos de transacciones tipo EXPENSE
    const expenseTransactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        type: 'EXPENSE',
        date: { gte: startDate },
      },
      select: { amount: true, date: true },
    });

    // Ingresos de transacciones tipo INCOME (que no sean facturas duplicadas)
    const incomeTransactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        type: 'INCOME',
        date: { gte: startDate },
      },
      select: { amount: true, date: true },
    });

    // Agrupar por mes
    const monthMap: Record<string, { month: string; income: number; expenses: number; profit: number }> = {};

    const getMonthKey = (date: Date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const getMonthLabel = (key: string) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    };

    // Inicializar todos los meses
    for (let i = 0; i < months; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const key = getMonthKey(d);
      monthMap[key] = { month: getMonthLabel(key), income: 0, expenses: 0, profit: 0 };
    }

    for (const inv of invoices) {
      const key = getMonthKey(inv.issueDate);
      if (monthMap[key]) monthMap[key].income += Number(inv.total);
    }
    for (const inc of incomeTransactions) {
      const key = getMonthKey(inc.date);
      if (monthMap[key]) monthMap[key].income += Number(inc.amount);
    }
    for (const pur of purchases) {
      const key = getMonthKey(pur.issueDate);
      if (monthMap[key]) monthMap[key].expenses += Number(pur.total);
    }
    for (const exp of expenseTransactions) {
      const key = getMonthKey(exp.date);
      if (monthMap[key]) monthMap[key].expenses += Number(exp.amount);
    }

    const data = Object.values(monthMap).map(m => ({
      ...m,
      profit: m.income - m.expenses,
    }));

    const totalIncome = data.reduce((s, m) => s + m.income, 0);
    const totalExpenses = data.reduce((s, m) => s + m.expenses, 0);

    return {
      data,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        margin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      },
    };
  }

  // ─── Cartera: facturas pendientes de cobro por cliente ────────────────────────

  async getReceivables(userId: string, businessId: string) {
    await this.businessesService.findOne(userId, businessId);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ['SENT', 'VIEWED', 'OVERDUE'] },
      },
      select: {
        id: true, number: true, total: true, dueDate: true, status: true, issueDate: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Agrupar por cliente
    const byCustomer: Record<string, { customerName: string; total: number; count: number; invoices: typeof invoices }> = {};

    for (const inv of invoices) {
      const key = inv.customer?.id ?? '__sin_cliente__';
      const name = inv.customer?.name ?? 'Sin cliente';
      if (!byCustomer[key]) byCustomer[key] = { customerName: name, total: 0, count: 0, invoices: [] };
      byCustomer[key].total += Number(inv.total);
      byCustomer[key].count += 1;
      byCustomer[key].invoices.push(inv);
    }

    const totalPending = invoices.reduce((s, i) => s + Number(i.total), 0);
    const overdueCount = invoices.filter(i => i.dueDate && new Date(i.dueDate) < new Date()).length;

    return {
      totalPending,
      overdueCount,
      byCustomer: Object.values(byCustomer).sort((a, b) => b.total - a.total),
    };
  }

  // ─── Cuentas por pagar: órdenes de compra pendientes ─────────────────────────

  async getPayables(userId: string, businessId: string) {
    await this.businessesService.findOne(userId, businessId);

    const purchases = await this.prisma.purchase.findMany({
      where: {
        businessId,
        status: { in: ['DRAFT', 'RECEIVED'] },
      },
      select: {
        id: true, number: true, total: true, dueDate: true, status: true, createdAt: true,
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const bySupplier: Record<string, { supplierName: string; total: number; count: number }> = {};
    for (const p of purchases) {
      const key = p.supplier?.id ?? '__sin_proveedor__';
      const name = p.supplier?.name ?? 'Sin proveedor';
      if (!bySupplier[key]) bySupplier[key] = { supplierName: name, total: 0, count: 0 };
      bySupplier[key].total += Number(p.total);
      bySupplier[key].count += 1;
    }

    return {
      totalPayable: purchases.reduce((s, p) => s + Number(p.total), 0),
      overdueCount: purchases.filter(p => p.dueDate && new Date(p.dueDate) < new Date()).length,
      bySupplier: Object.values(bySupplier).sort((a, b) => b.total - a.total),
      items: purchases,
    };
  }

  // ─── Top productos vendidos ───────────────────────────────────────────────────

  async getTopProducts(userId: string, businessId: string, limit = 10) {
    await this.businessesService.findOne(userId, businessId);

    const items = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: { businessId, status: 'PAID' },
        productId: { not: null },
      },
      select: {
        quantity: true, total: true,
        product: { select: { id: true, name: true } },
      },
    });

    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of items) {
      if (!item.product) continue;
      const pid = item.product.id;
      if (!map[pid]) map[pid] = { name: item.product.name, quantity: 0, revenue: 0 };
      map[pid].quantity += Number(item.quantity);
      map[pid].revenue += Number(item.total);
    }

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}
