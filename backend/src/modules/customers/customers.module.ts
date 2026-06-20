import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { BusinessesModule } from '../businesses/businesses.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [BusinessesModule, PlanModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
