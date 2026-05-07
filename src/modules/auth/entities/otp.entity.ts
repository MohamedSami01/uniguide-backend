import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({
    type: 'timestamptz',
    name: 'expires_at',
  })
  expiresAt: Date;

  @Column({
    default: false,
    name: 'is_used',
  })
  isUsed: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    update: false,
  })
  createdAt: Date;
}