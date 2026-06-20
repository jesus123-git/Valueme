import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ProductsService } from '../products/products.service';
import { PlanService } from '../plan/plan.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private productsService: ProductsService,
    private planService: PlanService,
  ) {}

  // ─── Generar número de factura automático ─────────────────────────────────────

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { businessId } });
    const number = String(count + 1).padStart(4, '0'); // 0001, 0002...
    return `FV-${number}`;
  }

  // ─── Crear factura ────────────────────────────────────────────────────────────

  async create(userId: string, businessId: string, dto: CreateInvoiceDto) {
    await this.businessesService.findOne(userId, businessId);
    await this.planService.assertCanCreateInvoice(userId, businessId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La factura debe tener al menos un ítem');
    }

    // Calcular totales
    let subtotal = 0;
    let totalTax = 0;

    const itemsWithTotals = dto.items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      totalTax += itemTax;

      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: itemSubtotal + itemTax,
      };
    });

    const total = subtotal + totalTax;
    const number = await this.generateInvoiceNumber(businessId);

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        customerId: dto.customerId,
        number,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        subtotal,
        tax: totalTax,
        total,
        items: {
          create: itemsWithTotals,
        },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true, nit: true } },
      },
    });

    // Descontar inventario para los ítems vinculados a productos con trackInventory
    await Promise.all(
      dto.items
        .filter(item => item.productId)
        .map(item => this.productsService.adjustStock(item.productId!, item.quantity, 'subtract')),
    );

    return invoice;
  }

  // ─── Listar facturas de una empresa ──────────────────────────────────────────

  async findAll(userId: string, businessId: string) {
    await this.businessesService.findOne(userId, businessId);

    return this.prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  // ─── Obtener una factura por ID ───────────────────────────────────────────────

  async findOne(userId: string, businessId: string, invoiceId: string) {
    await this.businessesService.findOne(userId, businessId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true, nit: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.businessId !== businessId) throw new ForbiddenException('No tienes acceso a esta factura');

    return invoice;
  }

  // ─── Actualizar estado de la factura ─────────────────────────────────────────

  async updateStatus(userId: string, businessId: string, invoiceId: string, dto: UpdateInvoiceStatusDto) {
    await this.findOne(userId, businessId, invoiceId);

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: dto.status },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Eliminar factura (solo si está en DRAFT) ─────────────────────────────────

  async remove(userId: string, businessId: string, invoiceId: string) {
    const invoice = await this.findOne(userId, businessId, invoiceId);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden eliminar facturas en estado DRAFT');
    }

    return this.prisma.invoice.delete({ where: { id: invoiceId } });
  }

  // ─── Resumen de cartera: cobros pendientes y vencidos ────────────────────────

  async getReceivables(userId: string, businessId: string) {
    await this.businessesService.findOne(userId, businessId);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ['SENT', 'VIEWED', 'OVERDUE'] },
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Marcar automáticamente como OVERDUE las vencidas
    const now = new Date();
    const overdueIds = invoices
      .filter(inv => inv.dueDate && inv.dueDate < now && inv.status !== 'OVERDUE')
      .map(inv => inv.id);

    if (overdueIds.length > 0) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'OVERDUE' },
      });
    }

    const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const overdue = invoices
      .filter(inv => inv.dueDate && inv.dueDate < now)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    return {
      total,
      overdue,
      current: total - overdue,
      invoices,
    };
  }
}
