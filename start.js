const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const router = require('./router');
const cookieParser = require("cookie-parser");
app.use(cookieParser());

dotenv.config();
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use('/', router);

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
