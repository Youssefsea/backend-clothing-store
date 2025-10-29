const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const router = require('./router');
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());




app.use(cors({
  origin: ["https://front-clothing-store.vercel.app","https://admin-dashboard-clothing-pi.vercel.app"],
  optionsSuccessStatus: 200,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  exposedHeaders: "Content-Length,Authorization",
  maxAge: 86400,
  credentials: true
}));

app.use('/', router);

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
