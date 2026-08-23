import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    picture: text("picture"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const drinks = pgTable(
  "drinks",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    tagline: text("tagline").notNull().default(""),
    image: text("image").notNull(),
    description: text("description").notNull(),
    composition: jsonb("composition").$type<string[]>().notNull().default([]),
    allergens: text("allergens").notNull().default(""),
    available: boolean("available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("drinks_category_check", sql`${table.category} in ('chaudes', 'fraiches')`),
    index("drinks_category_sort_idx").on(table.category, table.sortOrder),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    drinkId: text("drink_id").notNull(),
    drinkName: text("drink_name").notNull(),
    drinkImage: text("drink_image").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull(),
    firstName: text("first_name").notNull(),
    note: text("note"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    userEmail: text("user_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("orders_date_check", sql`${table.date} ~ '^\\d{4}-\\d{2}-\\d{2}$'`),
    check("orders_time_check", sql`${table.time} ~ '^([01]\\d|2[0-3]):(00|30)$'`),
    index("orders_user_created_idx").on(table.userId, table.createdAt),
    index("orders_schedule_idx").on(table.date, table.time),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    endpoint: text("endpoint").primaryKey(),
    subscription: jsonb("subscription")
      .$type<{ endpoint: string; keys: { p256dh: string; auth: string } }>()
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("push_subscriptions_user_id_idx").on(table.userId)],
);
