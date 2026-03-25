import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SsoService } from './sso.service';
import { InitiateSsoDto } from './dto/initiate-sso.dto';
import { PullStatusDto } from './dto/pull-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SkipResourceCheck } from '../../common/skip-resource-check.decorator';

@Controller('sso')
export class SsoController {
  constructor(private readonly sso: SsoService) {}

  @Post('initiate')
  @UseGuards(JwtGuard)
  @SkipResourceCheck() // ✅ allow access for authenticated investors without resource mapping
  async initiate(@Body() dto: InitiateSsoDto, @Req() req: any) {
    return this.sso.initiateSso(dto, req);
  }

  @Post('pull-status')
  @UseGuards(JwtGuard)
  @SkipResourceCheck() // ✅ allow on-demand pull for authenticated users
  async pullStatus(@Body() dto: PullStatusDto, @Req() req: any) {
    return this.sso.pullStatus(dto, req);
  }

  @Post('update-status')
  @UseGuards(JwtGuard)
  @SkipResourceCheck() // ✅ allow outbound status update call trigger
  async updateStatus(@Body() dto: UpdateStatusDto, @Req() req: any) {
    return this.sso.updateStatus(dto, req);
  }
}
