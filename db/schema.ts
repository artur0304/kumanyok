import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const bookings=sqliteTable('bookings',{id:text('id').primaryKey(),resource:text('resource').notNull(),date:text('date').notNull(),start:integer('start').notNull(),end:integer('end').notNull(),requestedStart:integer('requested_start').notNull().default(9),requestedEnd:integer('requested_end').notNull().default(22),guests:integer('guests').notNull(),name:text('name').notNull(),phone:text('phone').notNull(),total:integer('total').notNull(),deposit:integer('deposit').notNull(),status:text('status').notNull(),created:text('created').notNull()},t=>[index('bookings_resource_date').on(t.resource,t.date)]);

