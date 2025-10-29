// src/routes/logs.js
import express from "express";
import mgmtDb from "../db/adminDb.js";
const router = express.Router();

router.get("/", async (req,res) => {
  const { from, to, user_id, connection_id } = req.query;
  const q = mgmtDb("logs").select("*");
  if (from) q.where("created_at", ">=", from);
  if (to) q.where("created_at", "<=", to);
  if (user_id) q.where("user_id", user_id);
  if (connection_id) q.where("connection_id", connection_id);
  q.orderBy("created_at","desc").limit(500);
  const logs = await q;
  res.json(logs);
});

export default router;
