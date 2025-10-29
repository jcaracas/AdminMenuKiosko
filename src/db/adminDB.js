// src/db/adminDb.js
import knex from "knex";
import dotenv from "dotenv";
dotenv.config();

const mgmtDb = knex({
  client: "pg",
  connection: process.env.MGMT_DB_URL,
  pool: { min: 0, max: 10 }
});

export default mgmtDb;
