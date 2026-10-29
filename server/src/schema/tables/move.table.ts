import { Column, type Generated, PrimaryGeneratedColumn, Table, Timestamp, Unique } from '@immich/sql-tools';
import type { PathType } from 'src/enum.js';

@Table('move_history')
// path lock (per entity)
@Unique({ name: 'UQ_entityId_pathType', columns: ['entityId', 'pathType'] })
// new path lock (global)
@Unique({ name: 'UQ_newPath', columns: ['newPath'] })
export class MoveTable {
  @PrimaryGeneratedColumn()
  id!: Generated<string>;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'character varying' })
  pathType!: PathType;

  @Column({ type: 'character varying' })
  oldPath!: string;

  @Column({ type: 'character varying' })
  newPath!: string;

  @Column({ type: 'bigint', nullable: true })
  sourceSize!: Generated<number | null>;

  @Column({ type: 'bytea', nullable: true })
  sourceChecksum!: Generated<Buffer | null>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sourceMtime!: Generated<Timestamp | null>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sourceAtime!: Generated<Timestamp | null>;
}
