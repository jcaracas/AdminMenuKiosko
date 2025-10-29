// src/db/connectionsManager.js
import knex from "knex";

export function createKnexForConnection(connConfig) {
  // connConfig: {db_type, host, port, database, username, password, extra}
  const clientMap = { pg: "pg", mysql: "mysql2", mssql: "mssql" };
  const client = clientMap[connConfig.db_type];
  if (!client) throw new Error("Unsupported DB type: " + connConfig.db_type);

  return knex({
    client,
    connection: {
      host: connConfig.host,
      port: connConfig.port,
      user: connConfig.username,
      password: connConfig.password,
      database: connConfig.database,
      ... (connConfig.extra || {})
    },
    pool: { min: 0, max: 5 }
  });
}
