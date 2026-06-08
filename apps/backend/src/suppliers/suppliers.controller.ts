import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear proveedor' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(user.id, businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.suppliersService.findAll(user.id, businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de proveedor' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(user.id, businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplierDto>,
  ) {
    return this.suppliersService.update(user.id, businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar proveedor (soft delete)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.remove(user.id, businessId, id);
  }
}
