// src/routes/query.js
import express from "express";
import sql from "mssql";
import mgmtDb from "../db/adminDb.js";
import { getConnectionById } from "../db/connections.js";

const router = express.Router();

/**
 * Helper: crear config para mssql combinando .env + host dinámico
 */
function makeMssqlConfig(host) {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    server: host,
    port: Number(process.env.DB_PORT) || 1433,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
      encrypt: process.env.DB_ENCRYPT === "false", // opcional: usar variable env, por defecto false
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
  };
}

/**
 * POST /query/execute
 * (mantengo por compatibilidad — valida SELECT/UPDATE sobre articulos)
 * body: { connectionId, sql }
 */
router.post("/execute", async (req, res) => {
  const { connectionId, sql: userQuery } = req.body;
  if (!connectionId || !userQuery) return res.status(400).json({ success: false, message: "connectionId y sql requeridos" });

  const qUp = userQuery.trim().toUpperCase();
  if (!(qUp.startsWith("SELECT") || qUp.startsWith("UPDATE"))) {
    return res.status(400).json({ success: false, message: "Solo se permiten SELECT o UPDATE" });
  }
  if (!/FROM\s+ARTICULO|UPDATE\s+ARTICULO/i.test(userQuery)) {
    return res.status(400).json({ success: false, message: "Solo se permite operar sobre la tabla 'articulos'" });
  }

  try {
    const conn = await getConnectionById(connectionId);
    if (!conn) return res.status(404).json({ success: false, message: "Conexión no encontrada" });

    const config = makeMssqlConfig(conn.host);
    const pool = await sql.connect(config);

    const result = await pool.request().query(userQuery);

    await pool.close();
    return res.json({ success: true, data: result.recordset || [], message: "Consulta ejecutada correctamente ✅" });
  } catch (err) {
    try { sql.close(); } catch (e) {}
    return res.status(500).json({ success: false, message: `Error al ejecutar: ${err.message}` });
  }
});

/**
 * GET /query/articulos/:connectionId
 * Trae los articulos (Codigo, Descrip, Precio, Observac, Web) donde Rubro = 18
 */
router.get("/articulos/:connectionId", async (req, res) => {
  const { connectionId } = req.params;
  
  try {
    const conn = await getConnectionById(connectionId);
    if (!conn) return res.status(404).json({ success: false, message: "Conexión no encontrada" });
    
    const config = makeMssqlConfig(conn.host);
    const pool = await sql.connect(config);
    
    // Parametrizado (no hay parámetros del usuario aquí, pero uso request para consistencia)
    const request = pool.request();
    const q = "SELECT Codigo, Descrip, Precio, Observac, Web FROM articulo WHERE grupo11 > @rubro";
    request.input("rubro", sql.Int, 0);

    const result = await request.query(q);
    await pool.close();
    
    return res.json({ success: true, data: result.recordset || [] });
  } catch (err) {
    try { sql.close(); } catch (e) {}
    return res.status(500).json({ success: false, message: `Error consultando articulos: ${err.message}` });
  }
});

/**
 * POST /query/toggle-web
 * Body: { connectionId, codigo }  -> togglea el campo Web (0/1) para artículo con Codigo y Rubro=18
 */
router.post("/toggle-web", async (req, res) => {
  const { connectionId, codigo, username, codLocal } = req.body;

  if (!connectionId || !codigo || !username || !codLocal) {
    return res.status(400).json({ success: false, message: "connectionId, codigo, username y codLocal son requeridos" });
  }

  try {
    const conn = await getConnectionById(connectionId);
    const config = makeMssqlConfig(conn.host);
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      DECLARE @output TABLE (Web BIT);
    
      UPDATE articulo
      SET Web = CASE WHEN Web = 1 THEN 0 ELSE 1 END
      OUTPUT inserted.Web INTO @output
      WHERE Codigo = '${codigo}' AND grupo11 > 0;
    
      SELECT Web FROM @output;
    `);
    
    if (!result.recordset.length) {
      await pool.close();
      return res.status(404).json({ success: false, message: "Artículo no encontrado" });
    }
    
    // FIX —— MSSQL BIT puede llegar como Buffer
    let raw = result.recordset[0].Web;
    const nuevoValor = Buffer.isBuffer(raw) ? raw[0] : raw;
    const valorBoolean = nuevoValor === 1;
    const requiereCorreccion = !valorBoolean;
    
    await pool.close();
    
    // Insert log
    await mgmtDb("logs").insert({
      username,
      codLocal,
      articuloCodigo: codigo,
      campo: "Web",
      valorNuevo: valorBoolean,
      requiereCorreccion
    });
    
    return res.json({
      success: true,
      message: `Artículo ${codigo} actualizado (Web=${nuevoValor})`,
      newWeb: nuevoValor
    });

  } catch (err) {
    try { sql.close(); } catch {}
    console.error("ERROR toggle-web:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



export default router;
