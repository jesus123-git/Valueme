import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { PlanService } from '../plan/plan.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private planService: PlanService,
  ) {}

  private async generateSaleNumber(businessId: string): Promise<string> {
    const count = await this.prisma.sale.count({ where: { businessId } });
    return `SALE-${String(count + 1).padStart(4, '0')}`;
  }

  async create(userId: string, businessId: string, dto: CreateSaleDto) {
    await this.planService.assertWriteAccess(userId, businessId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un ítem');
    }

    let subtotal = 0;
    let totalTax = 0;
    const items = dto.items.map(item => {
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
    const number = await this.generateSaleNumber(businessId);

    const sale = await this.prisma.sale.create({
      data: {
        businessId,
        customerId: dto.customerId ?? null,
        number,
        subtotal,
        tax: totalTax,
        total,
        paymentMethod: dto.paymentMethod,
        amountReceived: dto.amountReceived ?? null,
        items: { create: items },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });

    await Promise.all(
      dto.items
        .filter(i => i.productId)
        .map(i => this.productsService.adjustStock(i.productId!, i.quantity, 'subtract')),
    );

    await this.prisma.bizTransaction.create({
      data: {
        businessId,
        type: TransactionType.INCOME,
        amount: total,
        description: `Venta ${number}`,
        categoryLabel: 'Venta POS',
        date: new Date(),
      },
    });

    const warnings: string[] = [];
    for (const i of dto.items) {
      if (!i.productId) continue;
      const p = await this.prisma.product.findUnique({ where: { id: i.productId } });
      if (p && p.trackInventory && p.stock < 0) {
        warnings.push(`Stock negativo en "${p.name}" (${p.stock})`);
      }
    }

    return { sale, warnings };
  }

  async findAll(userId: string, businessId: string) {
    await this.planService.assertBusinessAccess(userId, businessId);
    return this.prisma.sale.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
      },
    });
  }
}
