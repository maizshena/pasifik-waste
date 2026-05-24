// src/config/db.js
'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'pasifik_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+07:00',
  charset:            'utf8mb4',
  typeCast: function (field, next) {
    // Only cast fields explicitly named is_active or is_* to boolean
    // Avoids miscasting COUNT(*) and other numeric fields
    if (
      field.type === 'TINY' &&
      field.length === 1 &&
      (field.name === 'is_active' || field.name.startsWith('is_'))
    ) {
      return field.string() === '1';
    }
    return next();
  },
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`[DB] Connected to MySQL — ${process.env.DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };

// "use strict";

// const mysql = require("mysql2/promise");
// require("dotenv").config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || "127.0.0.1",
//   port: parseInt(process.env.DB_PORT || "3306", 10),
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || "",
//   database: process.env.DB_NAME || "pasifik_db",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   timezone: "+07:00",
//   charset: "utf8mb4",
//   typeCast: function (field, next) {
//     if (field.type === "TINY" && field.length === 1) {
//       return field.string() === "1";
//     }
//     return next();
//   },
// });

// async function testConnection() {
//   try {
//     const conn = await pool.getConnection();
//     console.log(`[DB] Connected to MySQL — ${process.env.DB_NAME}`);
//     conn.release();
//   } catch (err) {
//     console.error("[DB] Connection failed:", err.message);
//     process.exit(1);
//   }
// }

// module.exports = { pool, testConnection };
