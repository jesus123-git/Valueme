import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorator personalizado que extrae el usuario autenticado de req.user
// (inyectado por JwtStrategy.validate()) directamente en el parámetro del método.
//
// Uso en un controller protegido:
//   @Get('profile')
//   @UseGuards(JwtAuthGuard)
//   getProfile(@CurrentUser() user: User) { ... }
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
