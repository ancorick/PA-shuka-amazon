# Shuka — PRD (Product Requirements Document)

| | |
|---|---|
| Продукт | **Shuka** — маркетплейс в стиле Amazon для Армении |
| Источник требований | `Shuka — Amazon-Style Marketplace Project Brief.pdf` (дословно перенесён в **Часть A**) |
| Дедлайн | 19.11.2026, 19:00 — отправить преподавателю **один URL** |
| Хостинг | Frontend → **Netlify**, Backend + SQLite → **Render (Free)** |
| Стек | React + Vite · Node.js + Express · SQLite (better-sqlite3) · multer + sharp · bcryptjs |

Документ состоит из двух частей:

- **Часть A — Исходный бриф.** Дословная копия PDF. Это неизменяемый источник истины: при любом расхождении прав бриф.
- **Часть B — Решения по реализации.** Как именно мы выполняем бриф: архитектура, деплой, схема, API, дизайн, тесты, план работ.

---

# Часть A — Исходный бриф (дословно из PDF)

> Ниже — полный текст `Shuka — Amazon-Style Marketplace Project Brief.pdf`, без сокращений и правок.

## Shuka — Amazon-Style Marketplace: Project Brief

### Overview

**Shuka** (Armenian for "market") is an Amazon-style marketplace for local use. Each student builds and deploys the whole product on their own: frontend, backend and a SQLite database. Anyone can register, sell products, and buy from several sellers in one cart. Payment is cash on delivery, so there is no payment gateway.

**The finished product is a live URL.** The teacher signs in, lists a product with photos, a description and a price, then signs in as a buyer to find, search for and order it. The seller then sees the order and where to deliver it in their dashboard.

**What is new compared to the library system:** stock that must stay correct when people buy at the same time, one cart split across several sellers, an order lifecycle with enforced rules, image uploads, and a production deployment.

**Market:** one country. Prices are in AMD, delivery is inside Armenia, and there is no international shipping, tax calculation or currency conversion.

### Users

There is one account type. Any registered user can buy, and becomes a seller by filling in a store name and phone. Permissions are checked on the server for every request; hiding a button is not security. There is no admin panel: categories come from a seed script.

| Who | Can do | Cannot do |
|---|---|---|
| Guest | Browse, search, view products | Add to cart, buy, sell |
| Buyer | Cart, checkout, order history, cancel before shipping, review delivered items | See other users' orders |
| Seller | Everything a buyer can, plus add and edit own products, see own incoming orders with delivery details, change their status | Edit other sellers' products, see their orders, buy own products |

### Features

All of these are required. Everything else is left out on purpose (see Out of scope).

| Area | Included |
|---|---|
| Accounts | Register, log in, log out, edit name and phone. Passwords hashed |
| Catalog | Product with title, description, price (AMD), stock, one category, 1–5 images. Categories are a flat list from the seed script |
| Discovery | Home page with newest products and category links. Keyword search on title and description. Filter by category and price range. Sort by newest, price, rating. Pagination |
| Cart | Add, change quantity, remove. Quantity cannot exceed stock. Items grouped by seller with totals. Signed-in users only |
| Checkout | Enter recipient, phone, region, city, street and apartment, and an optional note. Cash on delivery only. The last address is pre-filled next time |
| Buyer orders | Order list and detail with a status per seller. Cancel before the seller ships |
| Seller | Become a seller. Add, edit, unpublish products and upload images. Incoming orders with the buyer's phone and delivery address. Move orders through their statuses. Simple stats: orders by status and revenue from delivered orders |
| Reviews | 1–5 stars and text, only for delivered items, one per buyer per product. Average rating shown on the product |

### Pages

The product has two areas: the storefront and the seller dashboard.

#### Storefront

- **Header, on every page.** Logo, search bar, category menu, cart icon with item count, and an account menu: My orders, Sell on Shuka (or Seller dashboard once active), Log out.
- **Home.** Category links and a grid of the newest products.
- **Search and category results.** Result count, filters for category and price from–to, and a sort menu: newest, price low to high, price high to low, rating. Each product card shows the main image, title, price in AMD and average rating. Filters and sort are in the URL, so a search can be shared. An empty result says so and links back to all products.
- **Product page.** Image gallery, title, price, average rating, stock ("In stock", "Only 2 left", "Out of stock"), seller's store name, and description. A quantity selector that cannot go above stock, and Add to cart. Reviews below, newest first.
- **Cart.** Items grouped by seller, each group with its subtotal. Change quantity or remove. A warning when an item's price changed or it sold out since it was added. Grand total and Proceed to checkout.
- **Checkout.** One form: recipient name, phone, region (Yerevan or one of the 10 marzer), city or village, street, building and apartment, and a note for delivery. Below it, the items per seller, the total, and "Payment: cash on delivery". The Place order button locks after one click. A confirmation page shows the order number.
- **My orders.** A list of orders with number, date, total and a status per seller. The order page shows items, delivery address, and the status history of each seller's part. A Cancel button while a part is Placed or Confirmed, and Write a review on each delivered item.
- **Register and Log in.** Email, password, name and phone.

#### Seller dashboard

- **Become a seller.** Store name and phone. Active at once.
- **Overview.** Counts of orders to confirm and to ship, and revenue from delivered orders in the last 30 days.
- **Products.** A table of the seller's products: thumbnail, title, price, stock, published or not, and units sold. Buttons to edit, unpublish and add a product.
- **Product editor.** Title, category, description, price in AMD, stock, and up to 5 images with a main image. Save, with validation messages next to each field.
- **Orders and order detail.** Tabs by status with counts, newest first. The order detail shows the items with the prices at purchase time, the recipient, phone, full address and note, and the cash to collect. Buttons appear only for the moves allowed from the current status. The status history is shown below.

### Order lifecycle

One checkout creates one buyer order, split into one seller order per seller. Each seller order has five states, enforced on the server.

*Diagram from the brief — "order split and seller order lifecycle · 5 states":*

```
Each seller order moves forward on its own

┌──────────────────────────────┐                  ┌─────────────────────────────────┐
│ Buyer order #1042            │   split by seller│ Seller order A                  │
│ One checkout, 3 items,       │ ───────┬────────►│ 2 items, own status and history │
│ 2 sellers                    │        │         └─────────────────────────────────┘
│ Address and prices copied in │        │         ┌─────────────────────────────────┐
└──────────────────────────────┘        └────────►│ Seller order B                  │
                                                  │ 1 item, own status and history  │
                                                  └─────────────────────────────────┘

Lifecycle of one seller order

           seller confirms           seller ships         delivered, cash paid
┌────────┐               ┌───────────┐            ┌─────────┐            ╔═══════════╗
│ Placed │ ─────────────►│ Confirmed │ ──────────►│ Shipped │ ──────────►║ Delivered ║
└────────┘               └───────────┘            └─────────┘            ╚═══════════╝
     │                         │
     │   buyer or seller cancels
     │      ┌───────────┐      │
     └─────►│ Cancelled │◄─────┘
            └───────────┘
            stock restored

Cancelling is possible only before Shipped. Any other move returns 409 and writes nothing.
```

Only the seller moves an order forward. The buyer sees one order with a status per seller, and every allowed move adds a row to status_history.

### Data model

Ten tables in one SQLite file. Money is an integer number of dram, never a REAL. An order copies the product title, price and delivery address at the moment of purchase. Products that were ordered are unpublished, never deleted.

| Table | Columns | Constraints and indexes |
|---|---|---|
| users | id, email, password_hash, name, phone, store_name, created_at | email UNIQUE COLLATE NOCASE; store_name is NULL until the user becomes a seller, and unique when set |
| categories | id, name, slug | name and slug UNIQUE |
| products | id, seller_id, category_id, title, description, price_amd, stock, is_published, rating_avg, rating_count, created_at, updated_at | CHECK price_amd > 0, CHECK stock >= 0; index on (category_id, is_published, created_at) and on seller_id |
| product_images | id, product_id, file_path, position | UNIQUE (product_id, position) |
| cart_items | user_id, product_id, quantity, price_when_added | PRIMARY KEY (user_id, product_id); CHECK quantity > 0 |
| orders | id, buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at | request_key UNIQUE (stops double orders) |
| seller_orders | id, order_id, seller_id, status, subtotal_amd, updated_at | UNIQUE (order_id, seller_id); CHECK status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled'); index on (seller_id, status) |
| order_items | id, seller_order_id, product_id, title, unit_price_amd, quantity | Foreign key to products ON DELETE RESTRICT |
| status_history | id, seller_order_id, from_status, to_status, changed_by, created_at | Insert only, never updated |
| reviews | id, product_id, buyer_id, rating, body, created_at | CHECK rating BETWEEN 1 AND 5; UNIQUE (product_id, buyer_id) |

**SQLite rules to follow:** run `PRAGMA foreign_keys = ON` on every connection (it is off by default). Store dates as ISO-8601 text and booleans as 0 or 1. Use STRICT tables so a wrong type is rejected instead of silently stored.

### API

A REST JSON API. Every endpoint states who may call it, and the server enforces it. Errors use one shape, `{ "error": { "code", "message" } }`, with 400 for invalid input, 401 when signed out, 403 when not allowed, 404 when not found, and 409 for a conflict such as no stock left or a status change that is not allowed.

| Area | Endpoints | Who |
|---|---|---|
| Auth | POST /auth/register, POST /auth/login, POST /auth/logout, GET /me, PATCH /me | Anyone / signed in |
| Catalog | GET /categories; GET /products?q=&category=&minPrice=&maxPrice=&sort=&page=; GET /products/:id; GET /products/:id/reviews | Anyone |
| Cart | GET /cart; PUT /cart/items/:productId (set quantity); DELETE /cart/items/:productId | Signed in |
| Checkout | POST /orders with a request key | Signed in |
| Buyer orders | GET /orders; GET /orders/:id; POST /orders/:id/sellers/:sellerOrderId/cancel | Owner of the order |
| Reviews | POST /products/:id/reviews | Buyer with a delivered item |
| Seller | POST /seller/activate; GET /seller/overview | Signed in / seller |
| Seller products | GET, POST /seller/products; PATCH /seller/products/:id; POST, DELETE /seller/products/:id/images | Seller, own products only |
| Seller orders | GET /seller/orders?status=; GET /seller/orders/:id; POST /seller/orders/:id/status with `{ "to": "shipped" }` | Seller, own orders only |

The status endpoint is the only way to change a status, so the server is the one place that decides whether a move is allowed.

### The hard parts

A working demo can still hide these bugs. Each one has a matching test in Acceptance.

| # | Problem | The naive version | What is required |
|---|---|---|---|
| 1 | Overselling | Read stock, check it in JavaScript, then write the new value. Two buyers both see "1 left" and both get it | Checkout runs in one `BEGIN IMMEDIATE` transaction. Stock is reduced with `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`, then the number of changed rows is checked. If any line fails, roll back the whole order and return 409 with the product name. Cancelling returns the stock in the same transaction as the status change |
| 2 | "Database is locked" | Two requests write at once and one crashes with SQLITE_BUSY | Turn on WAL mode and set a busy timeout (for example 5 seconds). Keep transactions short: no file uploads or network calls inside them |
| 3 | Prices change after purchase | order_items reads the current product price | Copy title and unit price into order_items, and the address into orders. Editing a product never changes a past order. If the price changed since the item went into the cart, checkout stops and shows the new price |
| 4 | One cart, many sellers | One order with one status | One order splits into one seller order per seller. Each seller sees and moves only their part |
| 5 | Status changes that are not allowed | The UI sets any status | A list of allowed moves on the server; everything else returns 409. Every change adds a status_history row |
| 6 | Seeing other people's data | GET /seller/orders/42 returns order 42 to any seller | Every query is scoped to the current user, for example `WHERE id = ? AND seller_id = ?` |
| 7 | Double checkout | A double click creates two orders | The page sends a random request key with the order. The UNIQUE constraint rejects a repeat, and the server returns the existing order |
| 8 | Broken references | Foreign keys silently not enforced, or a product row deleted from under its orders | `PRAGMA foreign_keys = ON` on every connection. Sellers unpublish instead of deleting |
| 9 | Images | 6 MB phone photos saved as BLOBs in the database | Check type and size, resize to a thumbnail and a large version, save files in an uploads folder, keep only the path in SQLite |

### Technical requirements

The whole product runs as one server process: it serves the API and the built frontend, and reads one SQLite file. The checkout transaction and the seller overview queries are written in plain SQL, even if a query builder is used elsewhere.

| Part | Requirement | Suggested tools |
|---|---|---|
| Frontend | Responsive; the whole buyer flow works on a phone | React + Vite, or server-rendered pages |
| Backend | REST JSON API; every permission check on the server | Node.js with Express or Fastify |
| Database | One SQLite file, WAL mode, foreign keys on, busy timeout set | better-sqlite3 |
| Schema and data | Numbered `.sql` migration files in Git, applied by a small script. A seed script creates categories, 3 sellers, 40+ products with images, and 2 demo buyers | Plain SQL files |
| Images | Checked, resized, saved in an uploads folder next to the database | multer + sharp |
| Auth | Hashed passwords, httpOnly session cookie | bcrypt or argon2 |
| Hosting | Public HTTPS URL. The SQLite file and uploads folder live on a persistent disk | Fly.io or Railway with a volume, Render with a persistent disk, or a small VPS with Caddy |

**Deployment rules:** serverless hosts without a persistent disk will lose the database on every deploy, so they cannot be used. Secrets live only in environment variables. A daily backup copies the database with `VACUUM INTO` or the `.backup` command. The README starts everything locally with one command.

### Acceptance

The product is accepted when the teacher completes the demo script on the live URL without help, and the student shows every break-it test passing.

**Teacher demo script** (on a laptop and a phone):

1. Register, become a seller, and add a product with 3 photos, a description, a category and a price in AMD.
2. In a private window, register a second account as a buyer.
3. Find the product from its category page and by keyword search.
4. Add it and a product from another seller to the cart. Change a quantity. Try to add more than the stock.
5. Enter a delivery address and place the order, cash on delivery.
6. As the seller, open the order: items, buyer's phone and delivery address are there. Move it to Confirmed, Shipped, then Delivered.
7. As the buyer, see the status history, then leave a review. The product's rating changes, and the seller's stock and revenue are updated.

**Break-it tests** (scripts the student runs in front of the teacher):

| Test | How | Expected |
|---|---|---|
| Last units | A product with stock 3; a script sends 30 checkouts at the same time for 1 unit each | Exactly 3 orders, 27 answers of 409, stock 0, no "database is locked" errors |
| Double click | Send the same checkout twice with the same request key | One order |
| Price changed | Buyer adds an item, seller raises the price, buyer checks out | Checkout stops and shows the new price |
| Old order after edit | Seller edits the title and price of a product already ordered | The old order still shows the old title and price |
| Someone else's order | Seller A opens seller B's order by ID; buyer A opens buyer B's order | 403 or 404, no data shown |
| Move not allowed | Seller moves Placed straight to Delivered; buyer cancels a shipped order | 409, nothing changed |
| Cancel returns stock | Buyer cancels a placed order | Stock goes back up by the ordered quantity |
| Foreign keys | Insert an order item for a product ID that does not exist | Rejected by SQLite |
| Bad upload | Upload a 30 MB file and a renamed .exe | Both rejected with a clear message |

### Out of scope

These are left out to keep the project to one person's size. A student who finishes early can add them as optional extensions:

- Guest cart, saved address book, wishlist, save for later.
- Nested categories, product attributes, size and color variants.
- Typo-tolerant search and autocomplete (SQLite FTS5 is the natural next step).
- Seller store pages, sales charts, low-stock alerts.
- Delivery fees, coupons, returns.
- Email or in-app notifications.
- Admin panel for approving sellers and moderating products and reviews.

---

# Часть B — Решения по реализации

> **Итоговая реализация (обновлено):** репозиторий разделён на `frontend/` (Netlify) и `backend/` (Render). Фронт обращается только к `/api/...`; Netlify проксирует `/api/*` → `https://<RENDER_URL>/:splat` (префикс `/api` отрезается), поэтому маршруты бэкенда совпадают с брифом буква в букву: `/auth/login`, `/products`, `/seller/orders/:id/status`… Картинки бэкенд отдаёт по `/uploads/*`, браузер получает их как `/api/uploads/*`. Render отдаёт только API (не фронт) — осознанное отклонение от «одного процесса» брифа, отмечено в README. Регистрация не требует настоящей почты (подходит любой адрес вида `a@b.cd`), пароль от 6 символов. Ниже, где написано «`/api/...` на бэкенде», читать «без префикса».

## B1. Цели и критерии успеха

1. Преподаватель открывает **один URL** (Netlify), проходит все 7 шагов demo script без помощи, на ноутбуке и на телефоне.
2. Все 9 break-it тестов запускаются одной командой и проходят.
3. Интерфейс визуально близок к Amazon: тёмная шапка, жёлтые и оранжевые кнопки, плотные карточки товаров, звёзды рейтинга. Логотип и бренд Amazon не используются: у нас свой wordmark «shuka».
4. Деплой без ручной магии: `git push` в GitHub, Netlify и Render подхватывают изменения автоматически.

## B2. Архитектура и деплой

```
                      ┌─────────────────────── Netlify (бесплатно) ───────────────────────┐
Браузер ── HTTPS ──►  │ shuka.netlify.app                                                  │
                      │   /            → frontend/dist (React SPA, статика)                  │
                      │   /api/*       → proxy 200 → https://shuka-api.onrender.com/api/*  │
                      │   /uploads/*   → proxy 200 → https://shuka-api.onrender.com/uploads/*
                      └────────────────────────────────────────────────────────────────────┘
                                                     │
                      ┌──────────────── Render Web Service (Free) ─────────────────────────┐
                      │ Node.js + Express (один процесс)                                    │
                      │   /api/*      REST JSON API                                         │
                      │   /uploads/*  картинки (thumb + large, webp)                        │
                      │   /*          тот же frontend/dist (запасной вход, требование брифа)  │
                      │ data/shuka.db (SQLite, WAL)  ·  data/uploads/  ·  data/backups/     │
                      └─────────────────────────────────────────────────────────────────────┘
```

**Почему именно так**

- Netlify держит только статику. Сервер с SQLite ему не по силам (бриф прямо запрещает serverless без диска), поэтому бэкенд живёт на Render.
- Netlify **проксирует** `/api` и `/uploads` на Render (`status = 200`, rewrite). Для браузера всё работает на одном домене, поэтому:
  - httpOnly-cookie сессии ставится как first-party, и логин работает в Safari/iOS и в приватном окне;
  - CORS не нужен.
- Express на Render тоже отдаёт `frontend/dist`. Требование брифа «один процесс отдаёт API и собранный фронтенд» выполнено, и Render-URL работает как запасной.
- Все API-маршруты из брифа смонтированы под префиксом **`/api`**: `POST /api/auth/login`, `GET /api/products` и т.д. Пути и семантика остаются как в брифе, префикс нужен только для проксирования.

### Ограничения бесплатного Render и как мы с ними живём

| Ограничение Free | Последствие | Наше решение |
|---|---|---|
| Нет Persistent Disk, файловая система временная | БД и загруженные фото теряются при редеплое или перезапуске | При старте сервер применяет миграции. Если БД пустая, он запускает сид: категории, 3 продавца, 40+ товаров с фото, 2 покупателя. Витрина всегда заполнена |
| Сервис засыпает после ~15 мин простоя, первый запрос идёт ~30–50 с | Холодный старт. После сна данные, созданные пользователями, теряются | Бесплатный пинг `GET /api/health` каждые 10 минут (cron-job.org или GitHub Actions). Сервис не засыпает: 750 ч/мес хватает на 24/7. Перед демо открыть сайт самому |
| — | Отклонение от брифа («persistent disk») | Честно указано в README. Путь к данным задаётся через `DATA_DIR`: подключение Render Disk (платно) или переезд на Fly/Railway volume не требует правок кода |

**Daily backup:** внутри процесса раз в 24 часа выполняется `VACUUM INTO 'data/backups/shuka-YYYY-MM-DD.db'`, хранятся последние 7 копий. Есть и ручной запуск: `npm run backup`.

### Политика зависимостей (лёгкий деплой)

| Где | Зависимости | Комментарий |
|---|---|---|
| `frontend/` (собирает Netlify) | `react`, `react-dom`, `react-router-dom`; dev: `vite`, `@vitejs/plugin-react` | Без UI-китов, без Tailwind, без иконочных пакетов. Чистый CSS и inline SVG. Сборка занимает секунды |
| `backend/` (собирает Render) | `express`, `better-sqlite3`, `multer`, `sharp`, `bcryptjs`, `jsonwebtoken`, `cookie-parser` | `bcryptjs` написан на чистом JS и не требует нативной сборки (алгоритм тот же, bcrypt). У `better-sqlite3` и `sharp` есть prebuilt-бинарники под Linux |
| Корень | без зависимостей, только npm-скрипты | Netlify собирает только `frontend/` (`base = "frontend"`) и серверные пакеты не трогает |

Node.js 20 LTS (`.nvmrc` и `engines`).

## B3. Структура репозитория

```
shuka/
├─ PRD.md
├─ README.md                  # локальный запуск одной командой, деплой, demo-аккаунты
├─ package.json               # скрипты: dev, start, build, test:breakit, backup
├─ netlify.toml               # base=client, proxy /api и /uploads → Render, SPA fallback
├─ render.yaml                # Blueprint для Render (build/start/env)
├─ .nvmrc  .gitignore  .env.example
├─ frontend/
│  ├─ index.html  vite.config.js  package.json
│  └─ src/
│     ├─ main.jsx  App.jsx  api.js          # fetch-обёртка, единая обработка ошибок
│     ├─ context/ (AuthContext, CartContext)
│     ├─ components/ (Header, CategoryNav, ProductCard, Stars, Price, Pagination, QtySelect, StatusBadge, StatusTimeline, ImageUploader, Field, Toast, ...)
│     ├─ pages/ (Home, Search, Product, Cart, Checkout, OrderConfirmation, MyOrders, OrderDetail, Login, Register, Account)
│     ├─ pages/seller/ (BecomeSeller, Overview, Products, ProductEditor, Orders, SellerOrderDetail)
│     └─ styles/ (tokens.css, base.css, components.css)
└─ backend/
   ├─ package.json
   ├─ migrations/
   │  ├─ 001_init.sql
   │  └─ 002_indexes.sql
   ├─ seed/
   │  ├─ seed.js  data.json             # категории, пользователи, товары
   │  └─ images/                        # фото для сид-товаров (в Git)
   ├─ scripts/ (migrate.js, backup.js)
   ├─ src/
   │  ├─ index.js            # старт: migrate → seed-if-empty → listen
   │  ├─ db.js               # одно соединение, PRAGMA, хелпер tx()
   │  ├─ app.js              # express, middleware, роуты, статика, error handler
   │  ├─ auth.js             # bcrypt, JWT-cookie, requireAuth, requireSeller
   │  ├─ errors.js           # HttpError + единый формат { error: { code, message } }
   │  ├─ validate.js
   │  ├─ images.js           # multer + sharp
   │  ├─ lifecycle.js        # таблица разрешённых переходов
   │  └─ routes/ (auth, catalog, cart, orders, reviews, seller, sellerProducts, sellerOrders)
   └─ tests/break-it/        # 9 скриптов + run-all.js
```

Локальный запуск одной командой: `npm run dev`. Скрипт ставит зависимости, если их нет, применяет миграции и сид, затем поднимает Express на :3000 и Vite на :5173 с proxy `/api` и `/uploads`.

## B4. База данных

### Подключение (`backend/src/db.js`)

```js
const db = new Database(path.join(DATA_DIR, 'shuka.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
```

- Процесс один, соединение одно (better-sqlite3 синхронный). PRAGMA выполняются на каждом открытом соединении, в том числе в скриптах migrate, seed, backup и в break-it тесте foreign keys.
- Транзакции на запись: `db.transaction(fn).immediate()`, это `BEGIN IMMEDIATE`. Внутри транзакции никаких await, файлов и сетевых вызовов.

### Миграции

- Файлы `backend/migrations/NNN_name.sql` применяются по порядку. Применённые записываются в служебную таблицу `_migrations`: это служебная таблица мигратора, не доменная, и «10 таблиц» из брифа она не нарушает.
- Все доменные таблицы объявлены как `STRICT`. Даты хранятся как ISO-8601 `TEXT` (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`), булевы значения как `INTEGER CHECK (x IN (0,1))`, деньги как `INTEGER` в драмах.
- `rating_avg` хранится как `REAL`: это не деньги, правило «никаких REAL» относится только к деньгам.

### Схема `001_init.sql`

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  store_name TEXT UNIQUE,                         -- NULL пока не продавец; UNIQUE допускает много NULL
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_amd INTEGER NOT NULL CHECK (price_amd > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX idx_products_cat_pub_created ON products(category_id, is_published, created_at);
CREATE INDEX idx_products_seller ON products(seller_id);

CREATE TABLE product_images (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,                        -- базовое имя, напр. "p12-8f3a"; файлы: /uploads/p12-8f3a_thumb.webp и _large.webp
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 4),   -- 0 = главное фото
  UNIQUE (product_id, position)
) STRICT;

CREATE TABLE cart_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_when_added INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
) STRICT;

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,                          -- номер заказа; сид стартует с 1000
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  recipient TEXT NOT NULL,
  phone TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,                            -- улица + дом
  apartment TEXT,                                  -- квартира (необязательно для частного дома)
  note TEXT,
  total_amd INTEGER NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE seller_orders (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('placed','confirmed','shipped','delivered','cancelled')),
  subtotal_amd INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (order_id, seller_id)
) STRICT;
CREATE INDEX idx_seller_orders_seller_status ON seller_orders(seller_id, status);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  unit_price_amd INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
) STRICT;

CREATE TABLE status_history (
  id INTEGER PRIMARY KEY,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id),
  from_status TEXT,                                -- NULL для первой записи (→ placed)
  to_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
) STRICT;
-- insert-only: триггеры запрещают UPDATE и DELETE
CREATE TRIGGER status_history_no_update BEFORE UPDATE ON status_history
BEGIN SELECT RAISE(ABORT, 'status_history is insert-only'); END;
CREATE TRIGGER status_history_no_delete BEFORE DELETE ON status_history
BEGIN SELECT RAISE(ABORT, 'status_history is insert-only'); END;

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (product_id, buyer_id)
) STRICT;
```

Ровно 10 доменных таблиц. Отдельной таблицы сессий нет: сессия хранится в подписанном JWT (см. B5).

**«Последний адрес подставляется в следующий раз»** реализуется без отдельной таблицы адресов (address book в Out of scope): берётся адрес из последнего `orders` этого покупателя.

## B5. Аутентификация и права

- Пароль хешируется через `bcryptjs` (cost 10). Минимум 8 символов.
- Сессия хранится в cookie `shuka_session` (httpOnly, Secure в production, SameSite=Lax, 30 дней). Внутри лежит JWT `{ uid }`, подписанный `JWT_SECRET` из env. `POST /auth/logout` очищает cookie.
- `app.set('trust proxy', 1)`: Render и Netlify стоят перед сервером.
- Middleware:
  - `requireAuth` → иначе 401 `UNAUTHENTICATED`;
  - `requireSeller` → `store_name IS NOT NULL`, иначе 403 `NOT_A_SELLER`.
- **Каждый запрос ограничен текущим пользователем** прямо в SQL:
  - продавец: `... WHERE so.id = ? AND so.seller_id = ?`, `... WHERE p.id = ? AND p.seller_id = ?`;
  - покупатель: `... WHERE o.id = ? AND o.buyer_id = ?`;
  - чужой ресурс возвращает **404** (не выдаём даже факт существования).
- Продавец не может купить свой товар: `PUT /cart/items/:id` и `POST /orders` возвращают 403 `OWN_PRODUCT`.

## B6. Жизненный цикл заказа (сервер)

`backend/src/lifecycle.js`: единственный источник правды о переходах.

```js
const SELLER_MOVES = {
  placed:    ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
};
const BUYER_CAN_CANCEL_FROM = ['placed', 'confirmed'];
```

- `POST /seller/orders/:id/status { to }`: если перехода нет в таблице, сервер отвечает 409 `INVALID_TRANSITION` и ничего не пишет.
- `POST /orders/:id/sellers/:sellerOrderId/cancel`: покупатель отменяет только из `placed` или `confirmed`, иначе 409.
- Любой разрешённый переход выполняется одной `IMMEDIATE`-транзакцией:
  1. `UPDATE seller_orders SET status = ?, updated_at = ? WHERE id = ? AND seller_id = ? AND status = ?` (условие по текущему статусу защищает от гонки; changes = 0 → 409);
  2. `INSERT INTO status_history (...)`;
  3. при `cancelled` для каждой позиции `UPDATE products SET stock = stock + ? WHERE id = ?`.
- Ответ сервера содержит `allowedMoves`, по нему UI рисует кнопки. Решение всё равно принимает сервер.

## B7. Checkout (самая важная транзакция, plain SQL)

Запрос `POST /api/orders`:

```json
{ "requestKey": "uuid", "recipient": "...", "phone": "...", "region": "Lori",
  "city": "...", "street": "...", "apartment": "...", "note": "..." }
```

1. Валидация адреса вне транзакции: 400 `VALIDATION`, в ответе `fields: { phone: "..." }` для подсветки полей.
2. Если заказ с этим `request_key` уже есть у этого покупателя, сервер отвечает **200** с существующим заказом (double click).
3. `BEGIN IMMEDIATE`:
   - читает корзину вместе с текущими `price_amd`, `is_published`, `seller_id`;
   - пустая корзина → 409 `CART_EMPTY`;
   - если у какой-то позиции `price_when_added != price_amd`, сервер обновляет `price_when_added` до новой цены, делает **COMMIT только этого обновления** и отвечает 409 `PRICE_CHANGED` с `{ items: [{ productId, title, oldPrice, newPrice }] }`. Заказ при этом не создаётся. UI показывает новые цены, и покупатель подтверждает заказ повторно;
   - снятый с публикации товар → 409 `UNAVAILABLE` с названием товара;
   - для каждой позиции: `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ? AND is_published = 1`. Если `changes === 0`, транзакция откатывается целиком (throw) и сервер отвечает 409 `OUT_OF_STOCK`, `message: "Only N left of «Title»"`;
   - `INSERT orders` (адрес копируется), затем для каждого продавца `INSERT seller_orders` (status `placed`, subtotal), `INSERT order_items` (title и unit_price копируются) и `INSERT status_history (NULL → placed)`;
   - `DELETE FROM cart_items WHERE user_id = ?`;
   - `COMMIT`.
4. Если гонка на `request_key` упрётся в `UNIQUE`, сервер ловит `SQLITE_CONSTRAINT_UNIQUE` и возвращает существующий заказ.
5. Ответ 201: `{ order: { id, ... } }`, затем редирект на `/orders/:id/confirmation`.

На клиенте `requestKey = crypto.randomUUID()` создаётся один раз при открытии checkout. Кнопка Place order блокируется после первого клика и показывает спиннер.

## B8. API: детализация поверх брифа

Все маршруты имеют префикс `/api`. Формат ошибки всегда `{ "error": { "code": "OUT_OF_STOCK", "message": "Only 2 left of «Ararat 10y»", "fields"?: {...} } }`.

| Метод и путь | Кто | Заметки |
|---|---|---|
| `GET /api/health` | все | для пинга и прогрева |
| `POST /api/auth/register` | все | email, password, name, phone → ставит cookie, 201 |
| `POST /api/auth/login` | все | 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | все | 204 |
| `GET /api/me` | signed in | `{ id, email, name, phone, storeName, isSeller, cartCount, lastAddress }` |
| `PATCH /api/me` | signed in | name, phone |
| `GET /api/categories` | все | с количеством опубликованных товаров |
| `GET /api/products` | все | `q` (LIKE по title и description, без учёта регистра), `category` (slug), `minPrice`, `maxPrice`, `sort` = `newest` / `price_asc` / `price_desc` / `rating`, `page` (по 24). Ответ: `{ items, total, page, pages }`. Только `is_published = 1` |
| `GET /api/products/:id` | все | неопубликованный товар виден только владельцу, остальным 404. Включает images, seller storeName, stock |
| `GET /api/products/:id/reviews` | все | сначала новые; флаг `canReview` для текущего пользователя |
| `POST /api/products/:id/reviews` | buyer с delivered-позицией | 403 `NOT_ELIGIBLE`, 409 `ALREADY_REVIEWED`. В той же транзакции пересчитывает `rating_avg` и `rating_count` |
| `GET /api/cart` | signed in | группы по продавцам, subtotal, grandTotal, флаги `priceChanged` (`currentPrice`), `soldOut`, `unavailable`, `exceedsStock` |
| `PUT /api/cart/items/:productId` | signed in | `{ quantity }`; 409 `OUT_OF_STOCK` если quantity > stock; 403 `OWN_PRODUCT`. «Add to cart» добавляет к текущему количеству на клиенте и проверяется на сервере |
| `DELETE /api/cart/items/:productId` | signed in | |
| `POST /api/orders` | signed in | см. B7 |
| `GET /api/orders` | owner | список: номер, дата, total, статусы частей |
| `GET /api/orders/:id` | owner | позиции, адрес, части с историей и `canCancel` |
| `POST /api/orders/:id/sellers/:sellerOrderId/cancel` | owner | см. B6 |
| `POST /api/seller/activate` | signed in | storeName, phone; 409 `STORE_NAME_TAKEN` |
| `GET /api/seller/overview` | seller | plain SQL: `toConfirm` (placed), `toShip` (confirmed), `countsByStatus`, `revenue30d` (сумма subtotal для delivered, время доставки берётся из status_history за 30 дней) |
| `GET /api/seller/products` | seller | с `unitsSold` (сумма quantity по не отменённым частям) |
| `POST /api/seller/products` | seller | создаёт черновик (`is_published = 0`) |
| `PATCH /api/seller/products/:id` | seller, свой | поля, `isPublished`, `imageOrder: [imageId...]` (первый = главный). Публикация возможна только с ≥ 1 фото |
| `POST /api/seller/products/:id/images` | seller, свой | multipart `images[]`; итого ≤ 5 фото |
| `DELETE /api/seller/products/:id/images/:imageId` | seller, свой | позиции перенумеровываются. Нельзя удалить последнее фото опубликованного товара |
| `GET /api/seller/orders?status=` | seller | новые сверху; `counts` по статусам для табов |
| `GET /api/seller/orders/:id` | seller, свой | позиции с ценой на момент покупки, recipient, phone, адрес, note, `cashToCollect`, история, `allowedMoves` |
| `POST /api/seller/orders/:id/status` | seller, свой | `{ "to": "confirmed" }` |

Удаления товаров нет вообще, есть только unpublish (бриф, пункт 8).

## B9. Изображения

- `multer.memoryStorage()`, `limits: { fileSize: 5 MB, files: 5 }`. Ошибки отдаются в нормальном формате:
  - превышение лимита → 400 `FILE_TOO_LARGE` «Image is larger than 5 MB»;
  - неверный тип → 400 `BAD_FILE_TYPE` «Only JPEG, PNG or WebP images are allowed».
- Тип проверяется **по содержимому**, а не по расширению: `sharp(buffer).metadata()` должен вернуть `jpeg`, `png` или `webp`. Переименованный `.exe` не проходит.
- Обработка идёт **до и вне** транзакции: `rotate()` (EXIF) → `_thumb.webp` (400px) и `_large.webp` (1200px), quality 80, в `DATA_DIR/uploads/`. После этого короткая транзакция вставляет строки в `product_images`.
- В SQLite хранится только базовое имя файла. Раздача идёт через `express.static` с `Cache-Control: public, max-age=31536000, immutable` (имена уникальны).

## B10. Seed

Скрипт `backend/seed/seed.js` идемпотентен: запускается, если в `users` 0 строк.

- **Категории (плоский список, 10):** Electronics · Phones & Accessories · Computers · Home & Kitchen · Fashion · Beauty · Sports & Outdoors · Toys & Games · Books · Armenian Food & Drinks.
- **3 продавца:** например «Yerevan Electronics», «Ararat Home», «Gyumri Crafts & Food». **2 покупателя.** Демо-доступы указаны в README и в небольшой плашке «Demo accounts» на странице Log in.
- **42+ товара** с реалистичными названиями, описаниями, ценами в AMD, разным stock (часть с 1–3 шт., чтобы были видны «Only 2 left» и «Out of stock») и 1–3 фото у каждого. Фото проходят тот же sharp-конвейер, что и загрузки.
- **Фото сид-товаров** — настоящие фотографии со свободной лицензией (Unsplash или Pexels), скачаны один раз, сжаты до ≤ 150 KB и закоммичены в `backend/seed/images/`. Fallback, если фото нет: sharp генерирует аккуратную карточку-заглушку с цветом категории.
- Несколько готовых заказов в разных статусах и несколько отзывов, чтобы дашборд и рейтинги не были пустыми на старте.

## B11. Фронтенд: маршруты

| Путь | Страница |
|---|---|
| `/` | Home: hero-баннер, плитки категорий, сетка «New arrivals» |
| `/search?q=&category=&minPrice=&maxPrice=&sort=&page=` | Результаты; всё состояние хранится в URL |
| `/c/:slug` | То же, что search с предустановленной категорией |
| `/p/:id` | Product page |
| `/cart` | Cart |
| `/checkout` | Checkout (требует логин) |
| `/orders/:id/confirmation` | «Order placed, thank you!» + номер |
| `/orders`, `/orders/:id` | My orders / Order detail |
| `/login`, `/register`, `/account` | Auth, редактирование name и phone |
| `/sell` | Become a seller |
| `/seller`, `/seller/products`, `/seller/products/new`, `/seller/products/:id/edit`, `/seller/orders`, `/seller/orders/:id` | Seller dashboard |

- Защищённые маршруты при отсутствии сессии редиректят на `/login?next=...`.
- Клиент слушает 401 от API: сбрасывает пользователя и ведёт на логин.
- SPA fallback настроен и на Netlify (`/* → /index.html 200`), и в Express.

## B12. Дизайн: «близко к Amazon»

Свой бренд, но визуальный язык Amazon: плотно, функционально, контрастные CTA.

**Токены (`styles/tokens.css`)**

| Токен | Значение | Где |
|---|---|---|
| `--nav-bg` | `#131921` | основная шапка |
| `--subnav-bg` | `#232F3E` | полоса категорий, футер |
| `--page-bg` | `#EAEDED` | фон главной и списков |
| `--card-bg` | `#FFFFFF` | карточки, панели |
| `--btn-cart` | `#FFD814` (hover `#F7CA00`) | Add to cart, Proceed to checkout |
| `--btn-buy` | `#FFA41C` (hover `#FA8900`) | Place order |
| `--link` | `#007185` (hover `#C7511F`) | ссылки |
| `--price` | `#0F1111` | цена; «Only N left» → `#B12704` |
| `--star` | `#FFA41C` | звёзды |
| `--success` | `#067D62` | In stock, Delivered |
| `--text` / `--muted` / `--border` | `#0F1111` / `#565959` / `#D5D9D9` | |
| радиусы | кнопки pill 20px, карточки 8px | |
| шрифт | системный стек: `"Amazon Ember"` не используем → `Arial, "Helvetica Neue", system-ui, sans-serif` | без загрузки веб-шрифтов |

**Ключевые элементы**

- **Header (desktop):** wordmark «shuka» (белый, с оранжевой дугой-«улыбкой» в собственной форме) → «Deliver to Armenia» → поисковая строка во всю ширину, слева селект категории, справа оранжевая кнопка-лупа → «Hello, Name / Account & Lists» с dropdown (My orders, Sell on Shuka / Seller dashboard, Log out) → «Returns & Orders» → корзина с жёлтым счётчиком.
- **Sub-nav:** «☰ All» (выезжающее меню категорий) и горизонтальный список категорий.
- **Header (mobile):** первая строка ☰ · logo · account · cart, вторая строка поиск на всю ширину, третья строка категории со скроллом.
- **Product card:** белая, фото 1:1 (`object-fit: contain` на белом), название в 2 строки с обрезкой, звёзды + (count), цена крупно `12,500 ֏`.
- **Product page:** 3 колонки на desktop (галерея с превью слева | заголовок, рейтинг, цена, описание | buy box в рамке: цена, наличие, «Sold by Store», qty, жёлтая Add to cart). На mobile колонки идут одна под другой, buy box прилипает снизу.
- **Cart:** левая колонка с группами по продавцам («Sold by …», subtotal), правая с «Subtotal (N items): X ֏» и жёлтой кнопкой. Предупреждения выводятся жёлтой или красной плашкой у позиции.
- **Checkout:** Amazon-подобные шаги «1 Delivery address / 2 Payment: Cash on delivery / 3 Review items», справа order summary с оранжевой Place order.
- **Статусы:** цветные бейджи (Placed серый, Confirmed синий, Shipped фиолетовый, Delivered зелёный, Cancelled красный) и вертикальный timeline истории.
- **Seller dashboard:** левый sidebar (на mobile табы сверху), карточки KPI (To confirm, To ship, Revenue 30d), таблица товаров (на mobile превращается в карточки), табы статусов со счётчиками.
- **Цены:** формат `Intl.NumberFormat('en-US')` + ` ֏`, например `12,500 ֏`.
- **Регионы в checkout:** Yerevan, Aragatsotn, Ararat, Armavir, Gegharkunik, Kotayk, Lori, Shirak, Syunik, Tavush, Vayots Dzor.
- **Состояния:** skeleton-заглушки при загрузке, понятные пустые состояния («No results for "…"» → ссылка «See all products»), toast-уведомления (Added to cart и т.п.), ошибки валидации под каждым полем.
- **Язык интерфейса:** английский, как в брифе («In stock», «Only 2 left», «Out of stock»).
- **Адаптивность:** брейкпоинты 600 / 900 / 1200. Весь путь покупателя проверяется на ширине 375px.

## B13. Break-it тесты

Команда: `npm run test:breakit -- --base http://localhost:3000` (или URL продакшена). Скрипты используют встроенный `fetch` Node 20, без лишних зависимостей. Каждый сам готовит данные: регистрирует пользователей и создаёт товары через API.

| Тест брифа | Скрипт | Что проверяет |
|---|---|---|
| Last units | `01-last-units.js` | 30 покупателей, у каждого в корзине 1 шт. товара со stock 3. `Promise.all` из 30 `POST /orders` → ровно 3×201, 27×409, stock = 0, ни одного 500 / SQLITE_BUSY |
| Double click | `02-double-click.js` | два одновременных POST с одним requestKey → один и тот же order.id, в БД 1 заказ |
| Price changed | `03-price-changed.js` | add → seller PATCH price → checkout → 409 `PRICE_CHANGED` с newPrice |
| Old order after edit | `04-old-order.js` | заказ → seller меняет title и price → `GET /orders/:id` показывает старые |
| Someone else's order | `05-foreign-access.js` | seller A → `/seller/orders/{B}`; buyer A → `/orders/{B}` → 404 без данных |
| Move not allowed | `06-bad-move.js` | placed → delivered = 409; cancel shipped = 409; статус и история не изменились |
| Cancel returns stock | `07-cancel-stock.js` | stock до, после заказа и после отмены |
| Foreign keys | `08-foreign-keys.js` | прямой `INSERT INTO order_items` с несуществующим product_id через better-sqlite3 (с PRAGMA) → `SQLITE_CONSTRAINT_FOREIGNKEY`. Нужен локальный доступ к БД |
| Bad upload | `09-bad-upload.js` | 30 MB файл → 400 `FILE_TOO_LARGE`; `virus.exe`, переименованный в `.jpg` → 400 `BAD_FILE_TYPE` |

`run-all.js` печатает таблицу PASS/FAIL.

## B14. Деплой: пошагово

**GitHub**
1. `git init`, коммит, создать репозиторий и сделать `git push`. `data/`, `node_modules/`, `.env` и `frontend/dist` лежат в `.gitignore`.

**Render (Web Service, Free)**
1. New → Web Service → подключить репозиторий (или Blueprint из `render.yaml`).
2. Root Directory: пусто (корень репо). Runtime: Node.
3. Build Command: `npm run render-build` (ставит server + client и собирает client).
4. Start Command: `npm start` (migrate → seed-if-empty → listen на `$PORT`).
5. Env:
   - `NODE_ENV=production`
   - `JWT_SECRET=<длинная случайная строка>`
   - `DATA_DIR=./data`
   - `NODE_VERSION=20`
6. После деплоя проверить `https://<service>.onrender.com/api/health`.
7. Настроить пинг `https://<service>.onrender.com/api/health` каждые 10 минут на cron-job.org.

**Netlify**
1. Add new site → Import from GitHub → тот же репозиторий.
2. Настройки берутся из `netlify.toml`:
   ```toml
   [build]
     base = "frontend"
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/api/*"
     to = "https://<service>.onrender.com/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/uploads/*"
     to = "https://<service>.onrender.com/uploads/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
3. Вписать реальный адрес Render вместо `<service>` и запушить. Netlify пересоберёт сайт сам.
4. Переименовать сайт, например в `shuka-am.netlify.app`. **Этот URL отправляется преподавателю.**

## B15. План работ до 19:00

| # | Блок | Результат |
|---|---|---|
| 1 | Каркас репо, скрипты, netlify.toml, render.yaml | `npm run dev` поднимает пустые server и client |
| 2 | БД: миграции, db.js, seed (с фото) | 42+ товара в БД |
| 3 | API: auth, catalog, cart | витрина и корзина через API |
| 4 | API: checkout, orders, lifecycle, reviews | все «hard parts» на сервере |
| 5 | API: seller (activate, products, images, orders, overview) | dashboard API |
| 6 | Фронт: дизайн-токены, header, home, search, product | витрина в стиле Amazon |
| 7 | Фронт: cart, checkout, confirmation, my orders, order detail, reviews | полный путь покупателя |
| 8 | Фронт: seller dashboard | полный путь продавца |
| 9 | Break-it тесты, прогон demo script локально, mobile 375px | всё зелёное |
| 10 | Push → Render → Netlify, прогон demo script на проде | **URL готов** |

## B16. Out of scope

Всё из раздела «Out of scope» брифа (Часть A) **не** делаем. Дополнительно не делаем: email-подтверждение, восстановление пароля, i18n.

## B17. Риски

| Риск | Митигирующее действие |
|---|---|
| Render Free перезапустится во время проверки, и пользовательские данные пропадут | keep-alive пинг; сид при старте; при возможности перейти на Starter + Disk (только `DATA_DIR`) |
| Холодный старт ~50 с | открыть сайт за 5 минут до отправки ссылки и держать пинг |
| `sharp` или `better-sqlite3` не соберутся на Render | закрепить Node 20 (есть prebuilt), без exotic flags |
| Cookie не ставится через прокси | всё идёт с одного домена через Netlify rewrite; Secure + SameSite=Lax; `trust proxy` |
