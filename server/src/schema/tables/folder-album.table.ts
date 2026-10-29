import { Column, ForeignKeyColumn, type Generated, PrimaryColumn, Table } from '@immich/sql-tools';
import { UserTable } from 'src/schema/tables/user.table.js';

// Retained after logical album deletion: existing assets must never become unbound.
@Table('folder_album')
export class FolderAlbumTable {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  ownerId!: string;

  @Column({ unique: true })
  path!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: Generated<boolean>;
}
