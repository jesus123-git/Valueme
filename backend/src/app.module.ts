import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';

// ─── Módulo Personal ──────────────────────────────────────────────────────────
import { AuthModule }         from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CategoriesModule }   from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WebhooksModule }     from './modules/webhooks/webhooks.module';

// ─── Módulo Empresarial ───────────────────────────────────────────────────────
import { BusinessesModule }  from './modules/businesses/businesses.module';
import { CustomersModule }   from './modules/customers/customers.module';
import { InvoicesModule }    from './modules/invoices/invoices.module';
import { ProductsModule }    from './modules/products/products.module';
import { PriceListsModule }  from './modules/price-lists/price-lists.module';
import { QuotesModule }      from './modules/quotes/quotes.module';
import { SuppliersModule }   from './modules/suppliers/suppliers.module';
import { PurchasesModule }   from './modules/purchases/purchases.module';
import { ReportsModule }     from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    // Personal
    AuthModule,
    BankAccountsModule,
    CategoriesModule,
    TransactionsModule,
    WebhooksModule,

    // Empresarial
    BusinessesModule,
    CustomersModule,
    InvoicesModule,
    ProductsModule,
    PriceListsModule,
    QuotesModule,
    SuppliersModule,
    PurchasesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
