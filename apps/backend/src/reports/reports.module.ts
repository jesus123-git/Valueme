import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [PrismaModule, BusinessesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
