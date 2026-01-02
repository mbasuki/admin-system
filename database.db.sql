BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "products" (
	"id"	INTEGER,
	"name"	TEXT,
	"price"	REAL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "purchases" (
	"id"	INTEGER,
	"date"	TEXT,
	"customer"	TEXT,
	"product_id"	INTEGER,
	"quantity"	INTEGER,
	"total"	REAL,
	"status"	TEXT DEFAULT 'Active',
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "stock" (
	"product_id"	INTEGER,
	"quantity"	INTEGER,
	FOREIGN KEY("product_id") REFERENCES "products"("id")
);
INSERT INTO "products" VALUES (1,'Mechanical Keyboard',85.0);
INSERT INTO "products" VALUES (2,'USB-C Hub',40.0);
INSERT INTO "products" VALUES (3,'Laptop Stand',35.0);
INSERT INTO "products" VALUES (4,'Ergonomic Chair',200.0);
INSERT INTO "products" VALUES (5,'Smart Lamp',45.0);
INSERT INTO "products" VALUES (6,'27-inch Monitor',150.0);
INSERT INTO "products" VALUES (7,'Headphones',120.0);
INSERT INTO "products" VALUES (8,'Webcam 1080p',60.0);
INSERT INTO "products" VALUES (9,'External SSD 1TB',110.0);
INSERT INTO "products" VALUES (10,'Wireless Mouse',25.0);
INSERT INTO "purchases" VALUES (1,'2026-01-02','basuki',1,1,85.0,'Active');
INSERT INTO "purchases" VALUES (2,'2026-01-02','raiya',2,1,40.0,'Active');
INSERT INTO "stock" VALUES (1,29);
INSERT INTO "stock" VALUES (2,99);
INSERT INTO "stock" VALUES (6,15);
INSERT INTO "stock" VALUES (7,20);
INSERT INTO "stock" VALUES (5,35);
INSERT INTO "stock" VALUES (9,60);
INSERT INTO "stock" VALUES (10,50);
INSERT INTO "stock" VALUES (8,25);
INSERT INTO "stock" VALUES (3,45);
INSERT INTO "stock" VALUES (4,10);
COMMIT;
