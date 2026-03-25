import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResponseHelper } from 'src/common/response.helper';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid';

type UserLogType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_REACTIVATED'
  | 'EMAIL_VERIFICATION_SENT'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED';

function generateIuid(): string {
  const n = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return String(n);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.users.findFirst({
      where: { email: dto.email, deleted_at: null },
    });

    if (existing) {
      if (existing.is_email_verified === 0) {
        throw new ConflictException('EMAIL_EXISTS_UNVERIFIED');
      }
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        password_algo: 'argon2',
        user_type: 'INVESTOR',
        is_email_verified: 0,
        role_id: dto.roleId, // Role ID added here
      },
    });

    await this.createInvestorProfileIfMissing(user.id, dto);
    await this.logUserEvent(user.id, user.email, 'REGISTER', 'User registered');

    // Generate and send verification token
    const token = uuidv4();
    await this.prisma.user_tokens.create({
      data: {
        user_id: user.id,
        token_hash: token,
        token_type: 'EMAIL_VERIFICATION',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    if (user.email) {
      await this.mailService.sendVerificationEmail(user.email, token);
      await this.logUserEvent(
        user.id,
        user.email,
        'EMAIL_VERIFICATION_SENT',
        'Verification email sent',
      );
    }

    return {
      accessToken: this.generateToken(user),
      user: this.mapUserResponse(user),
    };
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.users.findFirst({
        where: { email: dto.email, deleted_at: null },
        include: { investor_profile: true, department_user: true, role: true },
      });

      if (!user) {
        await this.logUserEvent(
          null,
          dto.email,
          'LOGIN_FAILED',
          'User not found',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.is_email_verified === 0) {
        await this.logUserEvent(
          user.id,
          user.email,
          'LOGIN_FAILED',
          'Email not verified',
        );
        throw new UnauthorizedException('Email not verified');
      }

      if (!user.password_hash) {
        await this.logUserEvent(
          user.id,
          user.email,
          'LOGIN_FAILED',
          'Password not set',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      const passwordValid = await bcrypt.compare(
        dto.password,
        user.password_hash,
      );

      if (!passwordValid) {
        await this.logUserEvent(
          user.id,
          user.email,
          'LOGIN_FAILED',
          'Invalid password',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      await this.logUserEvent(
        user.id,
        user.email,
        'LOGIN_SUCCESS',
        'User logged in',
      );

      const resources = user.role_id
        ? await this.getResourcesForRole(user.role_id)
        : [];

      return ResponseHelper.success('Login successful', {
        accessToken: this.generateToken(user),
        user: this.mapUserResponse(user),
        profile: this.mapProfile(user),
        resources,
      });
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        return ResponseHelper.error(error.message);
      }
      return ResponseHelper.error('Login failed', {
        message: error.message,
        stack:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  async getCurrentUser(userId: bigint) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { investor_profile: true, department_user: true, role: true },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    const resources = user.role_id
      ? await this.getResourcesForRole(user.role_id)
      : [];

    return {
      user: this.mapUserResponse(user),
      profile: this.mapProfile(user),
      resources,
    };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      userType: user.user_type,
    };
    return this.jwtService.sign(payload);
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id.toString(),
      email: user.email,
      userType: user.user_type,
      isEmailVerified: user.is_email_verified,
      lastLoginAt: user.last_login_at,
      roleId: user.role_id,
      roleName: user.role?.name,
    };
  }

  private mapProfile(user: any) {
    if (user.user_type === 'INVESTOR' && user.investor_profile) {
      return {
        id: user.investor_profile.id.toString(),
        firstName: user.investor_profile.first_name,
        lastName: user.investor_profile.last_name,
        mobileNumber: user.investor_profile.mobile_number?.toString(),
        countryName: user.investor_profile.country_name,
        stateName: user.investor_profile.state_name,
        cityName: user.investor_profile.city_name,
        districtName: user.investor_profile.district_name,
        pinCode: user.investor_profile.pin_code,
      };
    }
    if (user.user_type === 'DEPARTMENT' && user.department_user) {
      return {
        id: user.department_user.id.toString(),
        fullName: user.department_user.full_name,
        email: user.department_user.email,
        mobile: user.department_user.mobile,
        deptId: user.department_user.dept_id,
        districtId: user.department_user.district_id,
        officeId: user.department_user.office_id,
      };
    }
    return null;
    }

  private async createInvestorProfileIfMissing(
    userId: bigint,
    dto: RegisterDto,
  ) {
    const existing = await this.prisma.investor_profiles.findUnique({
      where: { user_id: userId },
    });
    if (existing) return;
    await this.prisma.investor_profiles.create({
      data: {
        user_id: userId,
        uid: generateIuid(),
        first_name: dto.firstName,
        last_name: dto.lastName,
        country_name: dto.country || '',
        state_name: dto.state || '',
        city_name: '',
        district_name: dto.district || '',
        pin_code: dto.pinCode || '',
        address: dto.address || '',
        mobile_number: dto.mobile ? BigInt(dto.mobile) : BigInt(0),
        pan_card: dto.pan || null,
        legal_entity_name: dto.legalEntityName || null,
        cons_pan_card: dto.cons_pan || null,
        cons_first_name: dto.cons_fullName
          ? dto.cons_fullName.split(' ')[0]
          : null,
        cons_last_name: dto.cons_fullName
          ? dto.cons_fullName.split(' ').slice(1).join(' ') || '.'
          : null,
        cons_mobile_number: dto.cons_mobile || null,
        cons_email: dto.cons_email || null,
        cons_country_name: dto.cons_country || null,
        cons_state_name: dto.cons_state || null,
      },
    });
  }

  private async logUserEvent(
    userId: bigint | null,
    email: string | null,
    logType: UserLogType,
    description?: string,
  ) {
    await this.prisma.user_logs.create({
      data: {
        user_id: userId ?? undefined,
        user_type: 'INVESTOR',
        email: email ?? undefined,
        log_type: logType,
        description: description ?? null,
        ip_address: null,
        user_agent: null,
        session_id: null,
        token_id: null,
        metadata: undefined,
      },
    });
  }

  async getRoles() {
    return this.prisma.roles.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  private async getResourcesForRole(
    roleId: number,
  ): Promise<{ code: string; path: string }[]> {
    // ✅ use the parameter and the `roleResource` delegate
    const roleResources = await this.prisma.roleResource.findMany({
      where: { role_id: roleId },
      include: { resource: true },
    });

    return roleResources.map((rr) => ({
      code: rr.resource.code,
      path: rr.resource.path,
    }));
  }

  async verifyEmail(token: string) {
    const userToken = await this.prisma.user_tokens.findUnique({
      where: { token_hash: token },
      include: {
        user: { include: { investor_profile: true, department_user: true, role: true } },
      },
    });

    if (!userToken || userToken.used_at || userToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (userToken.token_type !== 'EMAIL_VERIFICATION') {
      throw new UnauthorizedException('Invalid token type');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: userToken.user_id },
        data: { is_email_verified: 1 },
      });

      await tx.user_tokens.update({
        where: { id: userToken.id },
        data: { used_at: new Date() },
      });
    });

    await this.logUserEvent(
      userToken.user_id,
      userToken.user?.email || null,
      'EMAIL_VERIFIED',
      'Email verified successfully',
    );

    const user = userToken.user;
    if (!user) throw new UnauthorizedException('User not found');

    const resources = user.role_id
      ? await this.getResourcesForRole(user.role_id)
      : [];

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        accessToken: this.generateToken(user),
        user: this.mapUserResponse(user),
        profile: this.mapProfile(user),
        resources,
      },
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.is_email_verified === 1) {
      throw new ConflictException('Email already verified');
    }

    const token = uuidv4();
    await this.prisma.user_tokens.create({
      data: {
        user_id: user.id,
        token_hash: token,
        token_type: 'EMAIL_VERIFICATION',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    if (user.email) {
      await this.mailService.sendVerificationEmail(user.email, token);
      await this.logUserEvent(
        user.id,
        user.email,
        'EMAIL_VERIFICATION_SENT',
        'Verification email resent',
      );
    }

    return { success: true, message: 'Verification email sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null },
    });

    if (!user) {
      // Don’t reveal if user exists
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    }

    const token = uuidv4();
    await this.prisma.user_tokens.create({
      data: {
        user_id: user.id,
        token_hash: token,
        token_type: 'PASSWORD_RESET',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    if (user.email) {
      await this.mailService.sendPasswordResetEmail(user.email, token);
      await this.logUserEvent(
        user.id,
        user.email,
        'PASSWORD_RESET_REQUESTED',
        'Password reset requested',
      );
    }

    return {
      success: true,
      message:
        'If your email is registered, you will receive a password reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userToken = await this.prisma.user_tokens.findUnique({
      where: { token_hash: token },
      include: { user: true },
    });

    if (!userToken || userToken.used_at || userToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (userToken.token_type !== 'PASSWORD_RESET') {
      throw new UnauthorizedException('Invalid token type');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: userToken.user_id },
        data: { password_hash: passwordHash },
      });

      await tx.user_tokens.update({
        where: { id: userToken.id },
        data: { used_at: new Date() },
      });
    });

    await this.logUserEvent(
      userToken.user_id,
      userToken.user?.email || null,
      'PASSWORD_RESET_COMPLETED',
      'Password reset successfully',
    );

    return { success: true, message: 'Password reset successfully' };
  }

  async checkRegistrationStatus(email?: string, pan?: string) {
    const result: any = {};

    if (email) {
      const user = await this.prisma.users.findFirst({
        where: { email, deleted_at: null },
      });

      if (user) {
        if (user.is_email_verified === 0) {
          result.email = {
            status: 'EMAIL_EXISTS_UNVERIFIED',
            message: 'Email exists but not verified',
          };
        } else {
          result.email = {
            status: 'EMAIL_EXISTS',
            message: 'Email already registered',
          };
        }
      } else {
        result.email = { status: 'AVAILABLE', message: 'Available' };
      }
    }

    if (pan) {
      const investor = await this.prisma.investor_profiles.findFirst({
        where: {
          pan_card: pan,
          user: { deleted_at: null },
        },
      });

      if (investor) {
        result.pan = { status: 'PAN_EXISTS', message: 'PAN already registered' };
      } else {
        result.pan = { status: 'AVAILABLE', message: 'Available' };
      }
    }

    return result;
  }

  async getUserById(userId: bigint) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    include: {
      investor_profile: true,
      department_user: true,
      role: true,
    },
  });

  if (!user || user.deleted_at) {
    throw new UnauthorizedException('User not found');
  }

  const resources = user.role_id
    ? await this.getResourcesForRole(user.role_id)
    : [];

  return {
    user: this.mapUserResponse(user),
    profile: this.mapProfile(user),
    resources,
  };
}

}
