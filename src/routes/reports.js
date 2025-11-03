// routes/reports.js
import express from "express";
import mgmtDb from "../db/adminDb.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// GET /reports/daily?date=YYYY-MM-DD
router.get("/daily", async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    // ejemplo: contar acciones por usuario
    const stats = await mgmtDb("logs")
      .select("username")
      .count("* as actions")
      .whereBetween("created_at", [`${date} 00:00:00`, `${date} 23:59:59`])
      .groupBy("username")
      .orderBy("actions", "desc");

    // devolver también detalles de las actions (limit)
    const recent = await mgmtDb("logs")
      .select("id","username","action","details","created_at")
      .whereBetween("created_at", [`${date} 00:00:00`, `${date} 23:59:59`])
      .orderBy("created_at","desc")
      .limit(200);

    res.json({ success: true, data: { stats, recent } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error generando reportes" });
  }
});

export default router;
