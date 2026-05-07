import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

import { User } from '../users/entities/user.entity';
import { Otp } from './entities/otp.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { AuthErrorCodes } from './auth.enums';
import type { JwtPayload } from './strategies/jwt.strategy';

import {
  ConflictAppException,
  UnauthorizedAppException,
  BadRequestAppException,
  NotFoundAppException,
} from '../../common/filters/http-exception.filter';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly SALT_ROUNDS = 12;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly REFRESH_TOKEN_TTL_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // REGISTER

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictAppException(
        AuthErrorCodes.PHONE_ALREADY_EXISTS,
        {
          message: 'Email already exists',
        },
      );
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
      governorate: dto.governorate ?? null,
      isVerified: false,
    });

    const saved = await this.userRepository.save(user);

    await this.generateAndSendOtp(dto.email);

    return {
      message: 'OTP sent to email',
      userId: saved.id,
    };
  }

  // LOGIN

  async login(dto: LoginDto): Promise<AuthTokenDto> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: dto.email,
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedAppException(
        AuthErrorCodes.INVALID_CREDENTIALS,
        {
          message: 'Invalid email or password',
        },
      );
    }

    const passwordMatch = user.password
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!passwordMatch) {
      throw new UnauthorizedAppException(
        AuthErrorCodes.INVALID_CREDENTIALS,
        {
          message: 'Invalid email or password',
        },
      );
    }

    if (!user.isVerified) {
      throw new UnauthorizedAppException(
        AuthErrorCodes.ACCOUNT_NOT_VERIFIED,
        {
          message: 'Please verify OTP first',
        },
      );
    }

    return this.issueTokens(user);
  }

  // SEND OTP

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundAppException(
        AuthErrorCodes.USER_NOT_FOUND,
        {
          message: 'User not found',
        },
      );
    }

    await this.generateAndSendOtp(dto.email);

    return {
      message: 'OTP sent successfully',
    };
  }

  // VERIFY OTP

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokenDto> {
    const otp = await this.otpRepository.findOne({
      where: {
        email: dto.email,
        code: dto.code,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!otp) {
      throw new BadRequestAppException(
        AuthErrorCodes.OTP_INVALID,
        {
          message: 'Invalid OTP code',
        },
      );
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestAppException(
        AuthErrorCodes.OTP_INVALID,
        {
          message: 'OTP expired',
        },
      );
    }

    if (otp.isUsed) {
      throw new BadRequestAppException(
        AuthErrorCodes.OTP_INVALID,
        {
          message: 'OTP already used',
        },
      );
    }

    otp.isUsed = true;

    await this.otpRepository.save(otp);

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        isVerified: true,
      })
      .where('email = :email', {
        email: dto.email,
      })
      .execute();

    const user = await this.userRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new NotFoundAppException(
        AuthErrorCodes.USER_NOT_FOUND,
        {
          message: 'User not found',
        },
      );
    }

    return this.issueTokens(user);
  }

  // REFRESH TOKEN

  async refresh(dto: RefreshTokenDto): Promise<AuthTokenDto> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(
        dto.refreshToken,
        {
          secret:
            this.configService.getOrThrow<string>(
              'JWT_REFRESH_SECRET',
            ),
        },
      );
    } catch {
      throw new UnauthorizedAppException(
        AuthErrorCodes.INVALID_REFRESH_TOKEN,
        {
          message: 'Invalid refresh token',
        },
      );
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .addSelect('user.refreshTokenExpiresAt')
      .where('user.id = :id', {
        id: payload.sub,
      })
      .getOne();

    if (!user || !user.refreshToken) {
      throw new UnauthorizedAppException(
        AuthErrorCodes.INVALID_REFRESH_TOKEN,
        {
          message: 'Invalid refresh token',
        },
      );
    }

    const isValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshToken,
    );

    if (
      !isValid ||
      (user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt < new Date())
    ) {
      throw new UnauthorizedAppException(
        AuthErrorCodes.INVALID_REFRESH_TOKEN,
        {
          message: 'Invalid refresh token',
        },
      );
    }

    return this.issueTokens(user);
  }

  // LOGOUT

  async logout(userId: string): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        refreshToken: null,
        refreshTokenExpiresAt: null,
      })
      .where('id = :id', {
        id: userId,
      })
      .execute();
  }

  // SEND EMAIL

  private async sendOtpEmail(
    email: string,
    code: string,
  ): Promise<void> {

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,

      port: Number(process.env.EMAIL_PORT) || 587,

      secure: false,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },

      tls: {
        rejectUnauthorized: false,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.verify();

    await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        `"UniGuide AI" <${process.env.EMAIL_USER}>`,

      to: email,

      subject: 'UniGuide OTP Verification',

      html: `
        <div style="font-family: Arial; padding:20px;">
          <h2>UniGuide AI Verification</h2>

          <p>Your OTP code is:</p>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:5px;
            color:#2563eb;
            margin:20px 0;
          ">
            ${code}
          </div>

          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    this.logger.log(
      `OTP Email sent successfully to ${email}`,
    );
  }

  // GENERATE OTP

  private async generateAndSendOtp(
    email: string,
  ): Promise<void> {

    await this.otpRepository
      .createQueryBuilder()
      .update(Otp)
      .set({
        isUsed: true,
      })
      .where(
        'email = :email AND is_used = false',
        { email },
      )
      .execute();

    const code = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES,
    );

    const otp = this.otpRepository.create({
      email,
      code,
      expiresAt,
    });

    await this.otpRepository.save(otp);

    await this.sendOtpEmail(email, code);

    this.logger.log(
      `OTP Email sent to ${email}`,
    );
  }

  // TOKENS

  private async issueTokens(
    user: User,
  ): Promise<AuthTokenDto> {

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.getOrThrow<string>(
          'JWT_REFRESH_SECRET',
        ),
      expiresIn:
        this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as any,
    });

    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      this.SALT_ROUNDS,
    );

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() +
      this.REFRESH_TOKEN_TTL_DAYS,
    );

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        refreshToken: hashedRefreshToken,
        refreshTokenExpiresAt: expiresAt,
      })
      .where('id = :id', {
        id: user.id,
      })
      .execute();

    return new AuthTokenDto(
      accessToken,
      refreshToken,
    );
  }
}