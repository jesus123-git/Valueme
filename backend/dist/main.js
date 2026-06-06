"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Finanzas API')
        .setDescription('API REST del proyecto Finanzas')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, config));
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`Backend corriendo en http://localhost:${port}/api/v1`);
    console.log(`Swagger en        http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map