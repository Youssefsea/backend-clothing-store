const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(client => {
    console.log('Connected successfully to PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('Database failed:', err.message);
  });

function convertPlaceholders(query, values) {
  let idx = 0;
  return query.replace(/\?/g, () => {
    idx++;
    return `$${idx}`;
  });
}

async function query(sql, params = []) {
  const text = convertPlaceholders(sql, params);
  const client = await pool.connect();  try {
    const result = await client.query(text, params);
    return [result.rows, result];
  } finally {
    client.release();
  }
}

module.exports = { query };
