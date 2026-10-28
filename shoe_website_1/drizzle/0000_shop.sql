CREATE TABLE products (id TEXT PRIMARY KEY, data TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE variants (product_id TEXT NOT NULL REFERENCES products(id), size INTEGER NOT NULL, color TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), PRIMARY KEY(product_id,size,color));
--> statement-breakpoint
CREATE TABLE customers (user_id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT, access_hash TEXT NOT NULL, customer TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, shipping INTEGER NOT NULL, total INTEGER NOT NULL, coupon TEXT, delivery TEXT NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'unpaid', status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id), name TEXT NOT NULL, size INTEGER NOT NULL, color TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0), unit_price INTEGER NOT NULL, image TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER order_items_stock_check BEFORE INSERT ON order_items BEGIN SELECT CASE WHEN COALESCE((SELECT stock FROM variants WHERE product_id=NEW.product_id AND size=NEW.size AND color=NEW.color),0)<NEW.quantity THEN RAISE(ABORT,'Insufficient stock') END; END;
--> statement-breakpoint
CREATE TRIGGER order_items_stock_reserve AFTER INSERT ON order_items BEGIN UPDATE variants SET stock=stock-NEW.quantity WHERE product_id=NEW.product_id AND size=NEW.size AND color=NEW.color; END;
--> statement-breakpoint
CREATE TRIGGER orders_cancel_restock AFTER UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status!='cancelled' BEGIN UPDATE variants SET stock=stock+COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id=NEW.id AND product_id=variants.product_id AND size=variants.size AND color=variants.color),0); END;
--> statement-breakpoint
CREATE TABLE coupons (code TEXT PRIMARY KEY, percent INTEGER NOT NULL CHECK(percent>=0 AND percent<=50), active INTEGER NOT NULL DEFAULT 1, min_total INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE wishlist (user_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id), PRIMARY KEY(user_id,product_id));
--> statement-breakpoint
CREATE TABLE reviews (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id), name TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating>=1 AND rating<=5), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, UNIQUE(user_id,product_id));
--> statement-breakpoint
CREATE TABLE newsletter (email TEXT PRIMARY KEY, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE requests (id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id), user_id TEXT, type TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE stock_alerts (email TEXT NOT NULL, product_id TEXT NOT NULL, size INTEGER NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(email,product_id,size,color));
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX orders_user ON orders(user_id,created_at);
--> statement-breakpoint
CREATE INDEX reviews_product ON reviews(product_id,status);
--> statement-breakpoint
CREATE TABLE categories (name TEXT PRIMARY KEY, active INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE brands (name TEXT PRIMARY KEY, active INTEGER NOT NULL DEFAULT 1);
