import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),expires:integer('expires').notNull(),created:integer('created').notNull().default(0),lastSeen:integer('last_seen').notNull().default(0),agent:text('agent').notNull().default('')});
export const attempts=sqliteTable('attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const prices=sqliteTable('prices',{id:text('id').primaryKey(),block:text('block').notNull(),lot:integer('lot').notNull(),area:integer('area').notNull(),baseCents:integer('base_cents').notNull(),discount:integer('discount').notNull(),cents:integer('cents').notNull(),usdCents:integer('usd_cents'),reopenConfirmed:integer('reopen_confirmed').notNull().default(0),currency:text('currency').notNull(),status:text('status').notNull(),updated:text('updated').notNull()});
export const revisions=sqliteTable('revisions',{id:text('id').primaryKey(),created:text('created').notNull(),rows:integer('rows').notNull(),user:text('user').notNull()});

export const priceHistory=sqliteTable("price_history",{id:text("id").primaryKey(),lotId:text("lot_id").notNull(),created:text("created").notNull(),actor:text("actor").notNull(),beforeJson:text("before_json"),afterJson:text("after_json").notNull()});

export const content=sqliteTable('content',{id:text('id').primaryKey(),kind:text('kind').notNull(),title:text('title').notNull(),body:text('body').notNull(),image:text('image').notNull().default(''),videoUrl:text('video_url').notNull().default(''),published:integer('published').notNull().default(0),created:text('created').notNull()});
export const leads=sqliteTable('leads',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull(),phone:text('phone').notNull(),lotId:text('lot_id').notNull(),currency:text('currency').notNull(),message:text('message').notNull(),promotionId:text('promotion_id').notNull().default(''),advisorId:text('advisor_id').notNull().default(''),advisorName:text('advisor_name').notNull().default(''),ticketJson:text('ticket_json').notNull().default(''),created:text('created').notNull(),consentVersion:text('consent_version').notNull(),stage:text('stage').notNull().default('new'),notes:text('notes').notNull().default(''),updated:text('updated').notNull().default('')});

export const securityEvents=sqliteTable('security_events',{id:text('id').primaryKey(),event:text('event').notNull(),actor:text('actor').notNull(),created:text('created').notNull()});

export const advisors=sqliteTable('advisors',{id:text('id').primaryKey(),name:text('name').notNull(),active:integer('active').notNull().default(1),deleted:integer('deleted').notNull().default(0),created:text('created').notNull(),updated:text('updated').notNull()});
