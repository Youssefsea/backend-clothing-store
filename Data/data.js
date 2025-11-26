const { Pool } = require('pg');
require('dotenv').config();

const data = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

data.connect()
  .then(client => {
    console.log('Connected successfully to PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('Database failed:', err.message);
  });



module.exports = data;
