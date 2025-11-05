// src/routes/connections.js
import express from "express";
import mgmtDb from "../db/adminDb.js";
import sql from "mssql";
import { requireAuth } from "../middleware/auth.js";

import { getConnectionById } from "../db/connections.js";

const router = express.Router();

router.use(requireAuth);

// listar conexiones
router.get("/", async (req, res) => {
  const conns = await mgmtDb("connections").select("id","name","host","created_by","created_at","codLocal");
  res.json(conns);
});

// ✅ Crear conexión
router.post("/",  async (req, res) => {
  try {
    const { name, host, codLocal } = req.body;
    if (!name || !host || !codLocal)
      return res.status(400).json({ error: "campos faltantes" });

    const [conn] = await mgmtDb("connections")
      .insert({
        name,
        host,
        codLocal,
        created_by: req.user.id,
      })
      .returning(["id", "name", "host", "codLocal"]);

    res.json(conn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear conexión" });
  }
});

// ✅ Editar conexión
router.put("/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, codLocal } = req.body;
    await mgmtDb("connections").where({ id }).update({ name, host, codLocal });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar conexión" });
  }
});

// ✅ Obtener detalle
router.get("/:id", async (req, res) => {
  try {
    const conn = await mgmtDb("connections").where({ id: req.params.id }).first();
    if (!conn) return res.status(404).json({ error: "no existe" });
    delete conn.password_enc;
    res.json(conn);
  } catch {
    res.status(500).json({ error: "Error al obtener conexión" });
  }
});

// ✅ Eliminar
router.delete("/:id",  async (req, res) => {
  try {
    await mgmtDb("connections").where({ id: req.params.id }).del();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Error al eliminar conexión" });
  }
});

/**
 * 🔹 Test de conexión a una BD externa (SQL Server)
 */
router.get("/test/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const connConfig = await getConnectionById(id);
    if (!connConfig) {
      return res.status(404).json({ success: false, message: "Conexión no encontrada en BD interna" });
    }

    // Combinamos datos fijos del .env con el host dinámico
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      server: connConfig.host,
      options: {
        encrypt: false, // usar según configuración del servidor
        trustServerCertificate: true,
        connectTimeout: 5000, // 5 segundos de timeout
      },
    };

    //console.log(`🔍 Probando conexión con host: ${connConfig.host} (${connConfig.name})...`);

    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    console.log(`✅ Conexión establecida correctamente con ${connConfig.host}`);
    await pool.close();

    res.json({
      success: true,
      message: `Conexión a (${connConfig.host}) OK ✅`,
    });
  } catch (err) {
    console.error("❌ Error al conectar a BD externa:", err);
    res.status(500).json({
      success: false,
      message: `Error al conectar con la BD externa: ${err.message}`,
    });
  }
});

// 🔹 Buscar conexión por codLocal
router.get("/by-codlocal/:codLocal",  async (req, res) => {
  try {
    const { codLocal } = req.params;
    if (!codLocal) return res.status(400).json({ error: "Falta el código local" });

    const conn = await mgmtDb("connections")
      .where({ codLocal })
      .select("id", "name", "host", "codLocal")
      .first();

    if (!conn) return res.json(null); // devuelve null si no existe

    res.json(conn);
  } catch (err) {
    console.error("❌ Error al buscar conexión por codLocal:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
