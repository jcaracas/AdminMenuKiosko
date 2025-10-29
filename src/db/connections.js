// src/db/connections.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.MGMT_DB_URL,
});



// --- Obtener una conexión por ID ---
export async function getConnectionById(id) {
  try {
    const { rows } = await pool.query("SELECT id, name, host FROM connections WHERE id = $1", [id]);
    return rows[0] || null;
  } catch (err) {
    console.error("Error al obtener conexión:", err.message);
    throw err;
  }
}

