import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum UserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text', nullable: true, select: false })
  password: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  governorate: string | null;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true, name: 'google_id' })
  googleId: string | null;

  @Column({
    type: 'text',
    nullable: true,
    select: false,
    name: 'refresh_token',
  })
  refreshToken: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    select: false,
    name: 'refresh_token_expires_at',
  })
  refreshTokenExpiresAt: Date | null;
}