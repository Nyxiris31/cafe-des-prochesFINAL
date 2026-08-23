CREATE TABLE "drinks" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"image" text NOT NULL,
	"description" text NOT NULL,
	"composition" jsonb DEFAULT '[]' NOT NULL,
	"allergens" text DEFAULT '' NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drinks_category_check" CHECK ("category" in ('chaudes', 'fraiches'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"drink_id" text NOT NULL,
	"drink_name" text NOT NULL,
	"drink_image" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"first_name" text NOT NULL,
	"note" text,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_date_check" CHECK ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "orders_time_check" CHECK ("time" ~ '^([01]\d|2[0-3]):(00|30)$')
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"endpoint" text PRIMARY KEY,
	"subscription" jsonb NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"picture" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "drinks_category_sort_idx" ON "drinks" ("category","sort_order");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_schedule_idx" ON "orders" ("date","time");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO "drinks" ("id", "name", "category", "tagline", "image", "description", "composition", "allergens", "available", "sort_order") VALUES
('cafe-latte', 'Café latte', 'chaudes', 'Douceur lactée & espresso délicat', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts/f7xy0nv3_Caf%C3%A9%20latte.png', 'Un espresso adouci par un lait chaud délicatement moussé : la boisson la plus douce de la carte.', '["Lait chaud moussé", "Double espresso"]'::jsonb, 'Lait', true, 1),
('cappuccino', 'Cappuccino', 'chaudes', 'Mousse aérienne & cacao fin', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts/eixmrmi9_Cappuccino.png', 'Le classique italien : un espresso corsé, du lait chaud velouté et une mousse dense coiffée de chantilly.', '["Lait chaud", "Espresso", "Chantilly"]'::jsonb, 'Lait', true, 2),
('espresso', 'Espresso', 'chaudes', 'Concentré pur & crema dorée', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts/8716v30s_Espresso.png', 'Court, intense et aromatique, coiffé d''une crema couleur noisette.', '["Espresso serré"]'::jsonb, 'Aucun', true, 3),
('viennois-chocolat', 'Viennois au chocolat', 'chaudes', 'Chocolat velouté & chantilly maison', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts/sc6hbig2_Viennois%20au%20chocolat.png', 'Un chocolat chaud gourmand, généreusement couronné de chantilly maison.', '["Lait chaud", "Cacao en poudre", "Chantilly", "Chocolat noir", "Topping chocolat"]'::jsonb, 'Lait', true, 4),
('cafe-allonge', 'Café allongé', 'chaudes', 'Café long & aromatique', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_beverage-booking-2/artifacts/5u5o826z_caf%C3%A9%20allong%C3%A9.png', 'Un espresso allongé à l''eau chaude : plus doux en bouche, parfait pour prendre son temps.', '["Espresso", "Eau chaude"]'::jsonb, 'Aucun', true, 5),
('chocolat-chaud', 'Chocolat chaud', 'chaudes', 'Cacao doux & réconfortant', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_beverage-booking-2/artifacts/p2vhytw5_Chocolat%20chaud.png', 'Un simple et bon chocolat chaud : du lait chaud et du cacao, sans chichi.', '["Lait chaud", "Cacao en poudre"]'::jsonb, 'Lait', true, 6),
('cafe-latte-glace', 'Café latte glacé', 'fraiches', 'Fraîcheur intense & lait soyeux', 'https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts/5wr0zn61_Caf%C3%A9%20latte%20glac%C3%A9.png', 'Un double espresso versé sur du lait froid et des glaçons.', '["Lait froid", "Double espresso", "Glaçons"]'::jsonb, 'Lait', true, 7)
ON CONFLICT ("id") DO NOTHING;
