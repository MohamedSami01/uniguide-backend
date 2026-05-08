import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Otp } from './entities/otp.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenDto } from './dto/auth-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly SALT_ROUNDS = 10;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ================= REGISTER =================

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const existingUser = await this.userRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.SALT_ROUNDS,
    );

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      isVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    await this.generateAndSendOtp(savedUser.email);

    return {
      message: 'User registered successfully',
      userId: String(savedUser.id),
    };
  }

  // ================= LOGIN =================

  async login(dto: LoginDto): Promise<AuthTokenDto> {
    const user = await this.userRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

   const isPasswordValid = await bcrypt.compare(
  dto.password,
  String(user.password),
);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    return this.issueTokens(
      String(user.id),
      user.email,
    );
  }

  // ================= SEND OTP =================

  async sendOtp(
    dto: SendOtpDto,
  ): Promise<{ message: string }> {
    await this.generateAndSendOtp(dto.email);

    return {
      message: 'OTP sent successfully',
    };
  }

  // ================= VERIFY OTP =================

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<AuthTokenDto> {
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email: dto.email,
        code: dto.code,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'Invalid OTP',
      );
    }

    const now = new Date();

    if (otpRecord.expiresAt < now) {
      throw new BadRequestException(
        'OTP expired',
      );
    }

    const user = await this.userRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'User not found',
      );
    }

    user.isVerified = true;

    await this.userRepository.save(user);

    return this.issueTokens(
      String(user.id),
      user.email,
    );
  }

  // ================= REFRESH TOKEN =================

  async refresh(
    dto: RefreshTokenDto,
  ): Promise<AuthTokenDto> {
    try {
      const payload =
        await this.jwtService.verifyAsync(
          dto.refreshToken,
          {
            secret:
              this.configService.get<string>(
                'JWT_REFRESH_SECRET',
              ) || 'refresh_secret',
          },
        );

     return this.issueTokens(
  String(payload.sub),
  String(payload.email),
);
    } catch {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }
  }

  // ================= LOGOUT =================

  async logout(userId: string): Promise<void> {
    this.logger.log(
      `User logged out: ${userId}`,
    );
  }

  // ================= SEND OTP EMAIL =================

  private async sendOtpEmail(
    email: string,
    otp: string,
  ): Promise<void> {
    this.logger.log(
      `OTP for ${email}: ${otp}`,
    );

    // TEMPORARY SUCCESS
    // لحد ما تركب Brevo صح
    return;
  }

  // ================= GENERATE OTP =================

  private async generateAndSendOtp(
    email: string,
  ): Promise<void> {
    const otp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        this.OTP_EXPIRY_MINUTES,
    );

    const otpEntity = this.otpRepository.create({
      email,
      code: otp,
      expiresAt,
    });

    await this.otpRepository.save(
      otpEntity,
    );

    await this.sendOtpEmail(email, otp);
  }

  // ================= ISSUE TOKENS =================

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokenDto> {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret:
            this.configService.get<string>(
              'JWT_SECRET',
            ) || 'jwt_secret',

          expiresIn: '1d',
        },
      );

    const refreshToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret:
            this.configService.get<string>(
              'JWT_REFRESH_SECRET',
            ) || 'refresh_secret',

          expiresIn: `${this.REFRESH_TOKEN_TTL_DAYS}d`,
        },
      );

    return {
      accessToken,
      refreshToken,
    };
  }
}