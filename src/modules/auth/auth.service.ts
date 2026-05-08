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
import axios from 'axios';
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

  // =========================
  // REGISTER
  // =========================
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
    };
  }

  // =========================
  // LOGIN
  // =========================
  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password || '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(
      String(user.id),
      user.email,
    );
  }

  // =========================
  // SEND OTP
  // =========================
  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.sendOtpEmail(dto.email, otp);

    return {
      message: 'OTP sent successfully',
      otp, // remove later in production if needed
    };
  }

  // =========================
  // VERIFY OTP
  // =========================
  async verifyOtp(dto: VerifyOtpDto) {
    // temporary static verification
    // replace with DB/Redis later

    if (!dto.code || dto.code.length !== 6) {
      throw new BadRequestException('Invalid OTP');
    }

    let user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      const randomPassword = await bcrypt.hash('temp123456', 10);

      user = this.usersRepository.create({
        name: 'OTP User',
        email: dto.email,
        password: randomPassword,
      });

      user = await this.usersRepository.save(user);
    }

    return this.issueTokens(
      String(user.id),
      user.email,
    );
  }

  // =========================
  // REFRESH TOKEN
  // =========================
  async refresh(userId: string, email: string) {
    return this.issueTokens(userId, email);
  }

  // =========================
  // LOGOUT
  // =========================
  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }

  // =========================
  // SEND EMAIL WITH BREVO API
  // =========================
  private async sendOtpEmail(email: string, otp: string) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'UniGuide AI',
            email: 'uni.guides.ai@gmail.com',
          },

          to: [
            {
              email,
            },
          ],

          subject: 'Your OTP Code',

          htmlContent: `
            <div style="font-family: Arial; padding:20px">
              <h2>UniGuide AI Verification</h2>

              <p>Your OTP code is:</p>

              <div style="
                font-size:32px;
                font-weight:bold;
                letter-spacing:5px;
                color:#2563eb;
                margin:20px 0;
              ">
                ${otp}
              </div>

              <p>This code expires in 5 minutes.</p>
            </div>
          `,
        },
        {
          headers: {
            'api-key': this.configService.get<string>(
              'BREVO_API_KEY',
            ),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send OTP email');

      console.log(
        error.response?.data || error.message,
      );

      // fallback
      this.logger.log(`OTP for ${email}: ${otp}`);
    }
  }

  // =========================
  // ISSUE TOKENS
  // =========================
  private async issueTokens(
    userId: string,
    email: string,
  ) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
      {
        secret:
          this.configService.get<string>(
            'JWT_ACCESS_SECRET',
          ) || 'access-secret',

        expiresIn: '1d',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      payload,
      {
        secret:
          this.configService.get<string>(
            'JWT_REFRESH_SECRET',
          ) || 'refresh-secret',

        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}