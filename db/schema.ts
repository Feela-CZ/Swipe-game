import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const saves=sqliteTable('game_saves',{
  owner:text('owner').notNull(),slot:text('slot').notNull(),
  payload:text('payload').notNull(),revision:integer('revision').notNull(),
  updatedAt:text('updated_at').notNull(),
},table=>[primaryKey({columns:[table.owner,table.slot]})]);
