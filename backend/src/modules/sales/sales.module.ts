import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [ProductsModule, PlanModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
