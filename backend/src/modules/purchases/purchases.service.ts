import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  private async generateNumber(businessId: string): Promise<string> {
    const count = await this.prisma.purchase.count({ where: { businessId } });
    return `OC-${String(count + 1).padStart(4, '0')}`;
  }

  async create(userId: string, businessId: string, dto: CreatePurchaseDto) {
    await this.businessesService.findOne(userId, businessId);

    const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const tax = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice * i.taxRate / 100, 0);
    const total = subtotal + tax;
    const number = await this.generateNumber(businessId);

    return this.prisma.purchase.create({
      data: {
        businessId,
        supplierId: dto.supplierId,
        number,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        subtotal,
        tax,
        total,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            total: i.quantity * i.unitPrice * (1 + i.taxRate / 100),
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async findAll(userId: string, businessId: string, status?: string) {
    await this.businessesService.findOne(userId, businessId);
    const where: any = { businessId };
    if (status) where.status = status;

    return this.prisma.purchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async findOne(userId: string, businessId: string, purchaseId: string) {
    await this.businessesService.findOne(userId, businessId);
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    if (!purchase) throw new NotFoundException('Orden de compra no encontrada');
    if (purchase.businessId !== businessId) throw new ForbiddenException();
    return purchase;
  }

  async updateStatus(userId: string, businessId: string, purchaseId: string, status: PurchaseStatus) {
    const purchase = await this.findOne(userId, businessId, purchaseId);
    if (purchase.status === 'CANCELLED')
      throw new BadRequestException('Esta orden ya fue cancelada');

    // Si se recibe la mercancía, actualizar stock de productos
    if (status === 'RECEIVED') {
      for (const item of purchase.items) {
        if (item.productId) {
          const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
          if (product?.trackInventory) {
            await this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) } },
            });
          }
        }
      }
    }

    return this.prisma.purchase.update({
      where: { id: purchaseId },
      data: { status },
    });
  }

  async remove(userId: string, businessId: string, purchaseId: string) {
    const purchase = await this.findOne(userId, businessId, purchaseId);
    if (purchase.status === 'PAID')
      throw new BadRequestException('No se puede eliminar una orden ya pagada');
    return this.prisma.purchase.delete({ where: { id: purchaseId } });
  }
}
