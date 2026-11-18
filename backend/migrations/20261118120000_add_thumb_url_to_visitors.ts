import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('visitors', 'thumb_url');
  if (!hasColumn) {
    await knex.schema.alterTable('visitors', (table) => {
      table.text('thumb_url').nullable().after('photo_url');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('visitors', 'thumb_url');
  if (hasColumn) {
    await knex.schema.alterTable('visitors', (table) => {
      table.dropColumn('thumb_url');
    });
  }
}
