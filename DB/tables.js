const mysql = require("mysql2");
const fs = require("fs");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL");
});

const schemaSQL = fs.readFileSync("DB/tables.sql", "utf8");

db.query(schemaSQL, (err, results) => {
  if (err) {
    console.error("Error executing SQL file:", err);
    process.exit(1);
  }
  console.log("Database schema applied successfully.");
  db.end();
});
