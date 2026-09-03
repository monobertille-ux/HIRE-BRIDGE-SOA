const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à PostgreSQL :', err.stack);
  } else {
    console.log(' Connecté avec succès à PostgreSQL (hirebridge)');
  }
});

module.exports = pool;