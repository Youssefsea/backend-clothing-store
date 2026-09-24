# Backend Technical Handover

## 1. Project Summary

This repository is a CommonJS Node.js/Express API for a clothing store. It uses PostgreSQL through `pg`, JWT authentication in an HTTP-only cookie, Cloudinary for images, Resend API for email notifications, Joi for selected request validation, and an in-memory product/OTP cache.

The existing architecture was retained:

`start.js` -> `router.js` -> middleware -> feature handlers -> PostgreSQL/external services

No database table, column, relation, type, or constraint was changed.

## 2. What I Found

- The application entry point is `start.js`; routes are registered in `router.js`.
- Authentication and OTP logic are in `auth/`.
- Product, cart, order, and admin handlers are grouped in `PRODUCTS/`.
- PostgreSQL access is centralized in `Data/data.js`.
- Uploads use memory storage and are streamed to Cloudinary.
- The API has no meaningful automated test suite; the `npm test` script is a placeholder.
- Several older dependencies are present without an in-repository usage reference. They were not removed because runtime usage may be supplied outside this repository.
- The database schema is not checked into this repository. Existing SQL statements identify the current entities but do not constitute permission to redesign them.

## 3. What I Removed

- `secrets.txt` was removed because it was not imported or referenced by the application and contained secret material.
- Hard-coded email credentials and the hard-coded ngrok token were removed from runtime code/configuration.

## 4. What I Fixed

- User administration queries no longer select the `password` column.
- Resend failures are no longer swallowed during OTP delivery.
- Order notification failure no longer changes a successfully committed order into a false HTTP 500 response.
- Payment transaction rollback is now attempted only after a transaction has actually started.
- OTP values and full signup request bodies are no longer written to logs.
- Product lookup, admin lookup, status, and toggle routes now validate their request fields.
- Production error responses no longer expose raw database or provider error messages.

## 5. What I Improved

- Added a shared Resend mailer in `Data/mailer.js`.
- Added `.env.example` documenting runtime configuration without real secrets.
- Added cache invalidation already used by product writes to the affected update paths.
- Kept existing route names, response keys, database names, and authentication behavior to avoid unnecessary breaking changes.

## 6. What I Added

- `Data/mailer.js`
- `.env.example`
- This handover document.

No new database feature or schema object was added.

## 7. Final Architecture

- **Entry point:** `start.js`; configures JSON/form parsing, cookies, Helmet, CORS, logging, routing, 404, and error handling.
- **Routing:** `router.js`; defines authentication, catalog, cart, order, admin, and logout endpoints.
- **Middleware:** `middelware/sure_token.js` verifies the `token` cookie, checks admin role, and runs Joi validation.
- **Authentication:** `auth/log_singup.js`; OTP cache, signup, password hashing, login, and JWT issuance.
- **Product/catalog:** `PRODUCTS/proudct.js`; product reads, admin writes, image uploads, and short-lived cache.
- **Cart/orders:** `PRODUCTS/make_order.js`; cart changes, checkout transaction, stock decrement, payment screenshot upload, and email notifications.
- **Admin:** `PRODUCTS/admin.js`; administrative order/user reads and order status changes.
- **Persistence:** `Data/data.js`; one PostgreSQL pool.
- **External services:** Cloudinary (`Data/cloudinary.js`) and Resend (`Data/mailer.js`).

## 8. Final File Structure

```text
.
├── start.js
├── router.js
├── Data/
│   ├── data.js
│   ├── cloudinary.js
│   └── mailer.js
├── auth/
│   ├── log_singup.js
│   └── OTPemail.js
├── middelware/
│   ├── Joi_postsure.js
│   ├── jwt_making.js
│   ├── multer.js
│   └── sure_token.js
├── PRODUCTS/
│   ├── admin.js
│   ├── make_order.js
│   └── proudct.js
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 9. Complete API Documentation

### Common conventions

- Base URL is the deployed host, or `http://localhost:3000` locally.
- Protected routes authenticate from the `token` HTTP-only cookie. Browsers must send requests with `credentials: "include"`.
- Login also returns the JWT in the JSON body for compatibility with existing clients.
- JSON requests use `Content-Type: application/json`.
- Upload routes use `multipart/form-data`.
- Typical errors are `{ "message": "..." }`; validation errors are `{ "message": "Validation error error", "details": ["..."] }`.
- Database failures normally return HTTP 500 with `{ "message": "Server error" }` or `{ "message": "Internal server error" }`.

### Authentication

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/signup` | No | `name`, `email`, `password`, `phone`, `otp` | 201, `{message,user:{name,email}}` |
| POST | `/send-otp` | No | `email`, `phone` | 200, `{message}` |
| POST | `/login` | No | `email`, `password` | 200, `{message,user,token}` and cookie |
| POST | `/logout` | Cookie | None | 200, `{message}` and cleared cookie |

Signup requires name length 3-100, valid email, password length 6-50, a 10-15 digit phone, and a six-digit OTP. OTPs expire from the in-memory cache after 60 seconds.

### Products

| Method | URL | Auth | Body/form fields | Success |
|---|---|---|---|---|
| GET | `/products` | No | None | 200, `{message,allProducts}` |
| POST | `/products/byName` | No | `{title}` | 200, `{message,product}` |
| POST | `/products/byCategory` | No | `{category_name}` | 200, `{message,products}` |
| POST | `/products/inRange` | No | `{minPrice,maxPrice}` | 200, `{message,products}` |
| POST | `/products/byColor` | No | `{color}` | 200, `{message,products}` |
| POST | `/products/add` | Admin cookie | multipart fields plus up to 5 `images` | 200, `{message,image_url}` |
| PUT | `/products/update` | Admin cookie | `id,title,description,price,category_name,discount,stock`; optional `image`, `image_url`, `sizes`, `colors`, `is_active` | 200, `{message}` |
| PUT | `/products/toggle` | Admin cookie | `{id}` | 200, `{message}` |

Empty product results use 404. Product writes invalidate the in-memory product cache.

### Cart

| Method | URL | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/cart/add` | Cookie | `{product_id,quantity,size,color}` | 201 or 200, `{message,cart_id}` |
| DELETE | `/cart/delete` | Cookie | `{product_id}` | 200, `{message}` |
| GET | `/cart` | Cookie | None | 200, `{message,cart_id,total,items}` |
| GET | `/cart/count` | Cookie | None | 200, `{count}` |
| POST | `/cart/update` | Cookie | `{product_id,delta,size,color}` | 200/201, `{message,cart_id}` |

Cart operations reject unavailable products, invalid quantities, missing size/color, and insufficient stock. An empty cart is represented by HTTP 404 for `/cart` and HTTP 200 with count `0` for `/cart/count`.

### Orders

| Method | URL | Auth | Body/form fields | Success |
|---|---|---|---|---|
| POST | `/orders/confirm` | Cookie | multipart `payment_method`, `address`, required `payment_screenshot` | 200, `{message,order_id,total,payment_screenshot,items_count}` |
| GET | `/orders/orderForUser` | Cookie | None | Handler-defined order list response |

Checkout creates the order, order items, stock decrements, and cart deletion in one PostgreSQL transaction. Email notifications happen after commit and are best-effort.

### Admin

All admin routes require a valid token whose JWT role is `admin`.

| Method | URL | Body | Success |
|---|---|---|---|
| GET | `/admin/orders` | None | 200, `{message,orders}` |
| GET | `/admin/orders/userId` | `{user_id}` | 200, `{message,orders}` |
| PUT | `/admin/orders/status` | `{order_id,status}` | 200, `{message}` |
| POST | `/admin/orders/userEmail` | `{email}` | 200, `{message,orders}` |
| GET | `/admin/users` | None | 200, `{message,users}` without passwords |
| DELETE | `/admin/users/delete` | `{user_id}` | 200, `{message,user}` |
| POST | `/admin/users/email` | `{email}` | 200, `{message,user}` without passwords |
| POST | `/admin/users/phone` | `{phone}` | 200, `{message,user}` without passwords |
| GET | `/isLoggedIn` | Valid token | None | 200, `{message,name,email}` |

The three lookup routes retain their existing HTTP methods for compatibility; clients currently send lookup values in the request body even for GET routes.

## 10. Authentication Documentation

1. Call `POST /send-otp` with email and phone.
2. Submit the received six-digit OTP to `POST /signup`.
3. Call `POST /login` with email and password.
4. The server sets a `token` cookie (`httpOnly`, `secure`, `SameSite=None`, two-hour lifetime) and returns the token in JSON.
5. Send the cookie on protected requests. In browser `fetch`, use `credentials: "include"`.
6. Admin routes require the JWT claim `role: "admin"`.
7. Call `POST /logout` to clear the cookie.

Example:

```js
await fetch(`${baseUrl}/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
```

## 11. Frontend Integration Guide

- Configure the API base URL per environment; do not hard-code a production host in components.
- Include `credentials: "include"` on login, protected calls, and logout.
- Send JSON for normal routes and `FormData` for product/payment uploads; do not manually set a multipart boundary.
- Treat 401 as an authentication expiry and send the user to login.
- Treat 403 as an authorization/CORS rejection.
- Treat 404 as a missing resource or empty collection, depending on the endpoint.
- Display `details` for validation errors.
- Product image responses contain a comma-separated `image_url` string for newly uploaded product images.
- Cart item fields include `final_price`, `subtotal`, and `available`.
- Checkout returns `order_id`, formatted `total`, payment screenshot URL, and item count.

## 12. Database Usage

The current code references these existing tables:

- `users`: identity, contact details, hashed password, and role.
- `products`: catalog data, price/discount, stock, images, sizes/colors, and active flag.
- `cart`: one cart record associated with a user.
- `cart_items`: product, quantity, size, and color selections.
- `orders`: customer snapshot, address, payment information, total, and status.
- `order_items`: products and quantities captured by an order.

The code uses parameterized PostgreSQL queries. No schema changes were made or proposed. Relations are inferred only from existing query joins and foreign-key-shaped IDs; the authoritative schema remains external to this repository.

## 13. Environment Variables

See [.env.example](/D:/nod.js/clothes_shop/.env.example). Required groups:

- PostgreSQL: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`
- Auth/server: `JWT_SECRET`, `PORT`, optional `NODE_ENV`
- Cloudinary: `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Notifications/tunnel: `ADMIN_EMAIL`, `NGROK_AUTHTOKEN`

Real credentials must be supplied through deployment secrets or an untracked `.env` file. Any previously exposed credentials should be rotated outside the codebase.

## 14. Validation / Error Handling

Joi validates authentication, product lookup/range/color, product toggle, cart, checkout, and admin lookup/status inputs. Authentication middleware returns 401 for missing/invalid cookies and 403 for non-admin users. Express has a final 404 handler and a centralized error handler in `start.js`.

Some legacy handlers still use endpoint-specific error messages and status conventions. These were preserved where changing them would be a breaking API change.

## 15. Testing / Verification

- `node --check` passed for every tracked JavaScript file.
- `npm test` passed, but the configured script only prints `All tests passed`; it is not a behavioral test suite.
- Secret-pattern search found no remaining hard-coded email credentials, ngrok token, or `SELECT * FROM users` query.
- Database-backed endpoint verification requires valid PostgreSQL, Cloudinary, Resend, and JWT environment values and was not run against production services.

## 16. Known Limitations

- OTP state and product cache are process-local; multiple application instances do not share them.
- The database schema is external and not versioned in this repository.
- The existing API uses GET request bodies for some admin lookups.
- The login response exposes the JWT in JSON in addition to the HTTP-only cookie for compatibility; removing it would be a breaking change.
- The test script is only a placeholder.
- Existing external credentials must be rotated by the owner because removing them from the working tree does not erase them from historical Git commits.

## 17. Exact Files Changed

- Added: `.env.example`, `BACKEND_HANDOVER.md`, `Data/mailer.js`
- Deleted: `secrets.txt`
- Modified: `.gitignore`, `PRODUCTS/admin.js`, `PRODUCTS/make_order.js`, `PRODUCTS/proudct.js`, `auth/OTPemail.js`, `auth/log_singup.js`, `docker-compose.yml`, `middelware/Joi_postsure.js`, `router.js`
- Pre-existing working-tree changes preserved: `PRODUCTS/make_order.js`, `PRODUCTS/proudct.js`, `auth/log_singup.js`, and `package-lock.json`
