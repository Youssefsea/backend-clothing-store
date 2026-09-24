const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const router = require("./router");

dotenv.config();

const app = express();

/*
|--------------------------------------------------------------------------
| Trust Proxy
|--------------------------------------------------------------------------
| Required when running behind Vercel/proxies so secure cookies and
| request protocol handling work correctly.
*/
app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/*
|--------------------------------------------------------------------------
| Cookies
|--------------------------------------------------------------------------
*/
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${
      req.headers.origin || "No origin"
    }`
  );

  next();
});

/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
*/
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

/*
|--------------------------------------------------------------------------
| Allowed Origins
|--------------------------------------------------------------------------
*/
const allowedOrigins = [
  // Production Frontend
  "https://front-clothing-store.vercel.app",

  // Admin Dashboard
  "https://admin-dashboard-clothing-pi.vercel.app",

  // Local Frontend
  "http://localhost:3000",
  "http://localhost:3001",

  // Existing backend/domain if still needed
  "https://backend-clothing-store2.obl.ee",
];

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/
app.use(
  cors({
    origin: function (origin, callback) {
      // Requests without Origin header:
      // Postman, server-to-server, curl, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS rejected origin:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
    ],

    exposedHeaders: ["Authorization"],

    optionsSuccessStatus: 200,
  })
);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/
app.use("/", router);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/
app.use((err, req, res, next) => {
  console.error("Server Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  /*
  |--------------------------------------------------------------------------
  | CORS Error
  |--------------------------------------------------------------------------
  */
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      message: "CORS error - Origin not allowed",
      origin: req.headers.origin || null,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Generic Server Error
  |--------------------------------------------------------------------------
  */
  return res.status(500).json({
    message: "Internal Server Error",
    ...(process.env.NODE_ENV === "development"
      ? { error: err.message }
      : {}),
  });
});

/*
|--------------------------------------------------------------------------
| Local Development
|--------------------------------------------------------------------------
| IMPORTANT:
| Vercel should receive the Express app as a handler instead of opening
| its own listening socket.
|--------------------------------------------------------------------------
*/
if (require.main === module) {
  const PORT = process.env.PORT || 6020;

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}


module.exports = app;