import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

export type UserRole = 'owner' | 'admin' | 'agent' | 'viewer';

/**
 * Worked example of the PostgreSQL side — structured, relational records.
 * Mirror this shape for leads, customers, deals and so on.
 */
@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  fullName!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  orgId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'agent' })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
