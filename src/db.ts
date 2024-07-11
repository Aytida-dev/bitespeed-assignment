import { readFileSync } from "fs";
import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbPort = process.env.DB_PORT
  ? parseInt(process.env.DB_PORT, 10)
  : undefined;

const sql = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: dbPort,
  ssl: {
    rejectUnauthorized: false,
    ca: readFileSync("./src/config/ca.pem").toString(),
  },
});

console.log("Connecting to database...");

sql.connect((err) => {
  if (err) {
    console.error("Error connecting to database: ", err);
    return;
  }
  console.log("Connected to database");
});

export default sql;
