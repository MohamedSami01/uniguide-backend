import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';
import { Resend } from 'resend';

import { User } from '../users/entities/user.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password as string,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') as string,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
      ) as string,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    this.logger.log(`OTP for ${dto.email}: ${otp}`);

    await this.sendOtpEmail(dto.email, otp);

    return {
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    return {
      message: 'OTP verified successfully',
    };
  }

  async refresh(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') as string,
      expiresIn: '15m',
    });

    return {
      accessToken,
    };
  }

  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }

  async sendOtpEmail(email: string, otp: string) {
    try {
      const resend = new Resend(
        this.configService.get<string>('RESEND_API_KEY'),
      );

      await resend.emails.send({
        from: 'UniGuide <onboarding@resend.dev>',
        to: email,
        subject: 'UniGuide OTP Verification',
        html: `
          <div style="font-family: Arial, sans-serif; padding:20px;">
            <h2>UniGuide Verification Code</h2>
            <p>Your OTP code is:</p>
            <h1 style="color:#2563eb;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send OTP email', error);
    }
  }
}