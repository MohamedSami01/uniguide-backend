import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST api/auth/register/ ────────────────────────────────────────────────
  @Post('register')
  @ApiOperation({ summary: 'تسجيل مستخدم جديد — Register a new user' })
  async register(@Body() dto: RegisterDto): Promise<{ message: string; userId: string }> {
    return this.authService.register(dto);
  }

  // ── POST api/auth/login/ ──────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل دخول — Login with JWT + refresh token' })
  async login(@Body() dto: LoginDto): Promise<AuthTokenDto> {
    return this.authService.login(dto);
  }

  // ── POST api/auth/otp/send/ ───────────────────────────────────────────────
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إرسال OTP على الموبايل — Send OTP to mobile' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.sendOtp(dto);
  }

  // ── POST api/auth/otp/verify/ ─────────────────────────────────────────────
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحقق من OTP — Verify OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokenDto> {
    return this.authService.verifyOtp(dto);
  }

  // ── POST api/auth/refresh/ ────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenDto> {
    return this.authService.refresh(dto);
  }

  // ── POST api/auth/logout/ ─────────────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.authService.logout(user.sub);
  }
}
