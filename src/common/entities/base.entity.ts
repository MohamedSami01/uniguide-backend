import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class TimeStamp {
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    update: false,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
  })
  deletedAt: Date;
}

export abstract class BaseEntity extends TimeStamp {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
