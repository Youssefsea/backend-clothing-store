# Clothing Store API

A complete e-commerce backend API for a clothing store built with Node.js and PostgreSQL.

## Features

- User authentication (JWT)
- Product management
- Shopping cart functionality
- Order processing
- Admin panel
- Email notifications
- Image upload (Cloudinary)
- Rate limiting
- Input validation

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Image Storage**: Cloudinary
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd clothes_shop
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file with:
```env
PGHOST=your_postgres_host
PGUSER=your_postgres_user
PGPASSWORD=your_postgres_password
PGDATABASE=your_postgres_database
PGPORT=5432
JWT_SECRET=your_jwt_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=3000
```

4. Set up the database
Run the SQL commands from `railway.sql` to create tables and insert sample data.

5. Start the server
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /signup` - Register new user
- `POST /send-otp` - Send OTP for email verification
- `POST /login` - User login
- `POST /logout` - User logout

### Products
- `GET /products` - Get all active products
- `POST /products/byName` - Get product by name
- `POST /products/byCategory` - Get products by category
- `POST /products/inRange` - Get products in price range
- `POST /products/byColor` - Get products by color
- `POST /products/add` - Add new product (Admin)
- `PUT /products/update` - Update product (Admin)
- `PUT /products/toggle` - Toggle product active status (Admin)

### Cart
- `POST /cart/add` - Add product to cart
- `DELETE /cart/delete` - Remove product from cart
- `GET /cart` - Get user's cart
- `GET /cart/count` - Get cart items count
- `POST /cart/update` - Update cart item quantity

### Orders
- `POST /orders/confirm` - Confirm payment and create order
- `GET /orders/orderForUser` - Get user's orders

### Admin
- `GET /admin/orders` - Get all orders
- `PUT /admin/orders/status` - Update order status
- `GET /admin/users` - Get all users
- `DELETE /admin/users/delete` - Delete user

## Docker Support

The project includes Docker configuration:

```bash
docker-compose up
```

This will start both the application and ngrok tunnel.

## Security Features

- JWT authentication
- Password hashing (bcrypt)
- Input validation
- Rate limiting
- CORS configuration
- Helmet security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License
