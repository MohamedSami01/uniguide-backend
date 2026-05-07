import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { NotFoundAppException } from '../../common/filters/http-exception.filter';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundAppException(
        'USER_NOT_FOUND',
        {
          message: 'User not found',
        },
      );
    }

    return user;
  }

  async findByEmail(
    email: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email,
      })
      .getOne();
  }

  async findByIdWithRefreshToken(
    id: string,
  ): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .addSelect('user.refreshTokenExpiresAt')
      .where('user.id = :id', {
        id,
      })
      .getOne();
  }
}