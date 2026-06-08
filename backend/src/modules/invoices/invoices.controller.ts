import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  // POST /api/v1/businesses/:businessId/invoices
  @Post()
  @ApiOperation({ summary: 'Crear factura con ítems y cálculo automático de IVA' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(user.id, businessId, dto);
  }

  // GET /api/v1/businesses/:businessId/invoices
  @Get()
  @ApiOperation({ summary: 'Listar todas las facturas de la empresa' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.invoicesService.findAll(user.id, businessId);
  }

  // GET /api/v1/businesses/:businessId/invoices/receivables
  @Get('receivables')
  @ApiOperation({ summary: 'Cartera: facturas pendientes de cobro y vencidas' })
  getReceivables(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.invoicesService.getReceivables(user.id, businessId);
  }

  // GET /api/v1/businesses/:businessId/invoices/:id
  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura con todos sus ítems' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(user.id, businessId, id);
  }

  // PATCH /api/v1/businesses/:businessId/invoices/:id/status
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado: DRAFT → SENT → PAID / OVERDUE' })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(user.id, businessId, id, dto);
  }

  // DELETE /api/v1/businesses/:businessId/invoices/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar factura (solo si está en DRAFT)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.remove(user.id, businessId, id);
  }
}
