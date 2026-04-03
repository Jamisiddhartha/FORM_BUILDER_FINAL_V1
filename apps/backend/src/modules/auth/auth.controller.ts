import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ResponseHelper } from '../../common/response.helper';
import { Public } from '../../common/public.decorator';
import { SkipResourceCheck } from '../../common/skip-resource-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private getAccessTokenMaxAge() {
    const expiresInSeconds = Number.parseInt(process.env.JWT_EXPIRATION || '3600', 10);

    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      return expiresInSeconds * 1000;
    }

    return 3600000;
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyEmail(token);

    if (result.success && result.data) {
      res.cookie('accessToken', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: this.getAccessTokenMaxAge(),
        path: '/',
      });
      return ResponseHelper.success(result.message, result.data);
    }

    return result;
  }

  @Public()
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Public()
  @Post('check-registration')
  async checkRegistration(@Body() body: { email?: string; pan?: string }) {
    return this.authService.checkRegistrationStatus(body.email, body.pan);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.authService.resetPassword(token, password);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    if (!result.success) {
      return ResponseHelper.error(result.message, result.error);
    }

    res.cookie('accessToken', result.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getAccessTokenMaxAge(),
      path: '/',
    });

    return ResponseHelper.success(result.message, result.data);
  }
  
  @Public()
  @Get('users/:id')
  @UseGuards(JwtGuard)
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(BigInt(id));
  }
  
  @SkipResourceCheck()
  @Get('profile')
  @UseGuards(JwtGuard)
  async getProfile(@CurrentUser() user: any) {
    const userId = BigInt(user.id);
    return this.authService.getCurrentUser(userId); // ✅ No manual conversion needed
  }

  @SkipResourceCheck()
  @Get('roles')
  @UseGuards(JwtGuard)
  async getAllRoles() {
    const roles = await this.authService.getRoles();
    return ResponseHelper.success('Roles fetched successfully', roles);
  }

  @SkipResourceCheck()
  @Post('logout')
  @UseGuards(JwtGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return ResponseHelper.success('Logged out successfully');
  }

  @Public()
  @Get('check')
  async checkAuth(@Req() req: Request) {
    const token = req.cookies?.accessToken;
    return ResponseHelper.success('Auth status', {
      authenticated: !!token,
    });
  }

  @Get('verify')
  @UseGuards(JwtGuard)
  async verifyToken(@CurrentUser() user: any) {
    // Just verify the token is valid by returning user
    return { valid: true, user };
  }
}
