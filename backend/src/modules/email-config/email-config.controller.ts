import {
  Controller, Get, Post, Delete,
  Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard }      from '../auth/guards/jwt-auth.guard';
import { CurrentUser }       from '../auth/decorators/current-user.decorator';
import { EmailConfigService } from './email-config.service';
import { SaveEmailConfigDto } from './dto/save-email-config.dto';

@Controller('email-config')
@UseGuards(JwtAuthGuard)
export class EmailConfigController {
  constructor(private readonly service: EmailConfigService) {}

  @Post()
  save(
    @CurrentUser() user: { id: string },
    @Body() dto: SaveEmailConfigDto,
  ) {
    return this.service.save(user.id, dto);
  }

  @Get()
  get(@CurrentUser() user: { id: string }) {
    return this.service.get(user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }) {
    return this.service.remove(user.id);
  }
}
