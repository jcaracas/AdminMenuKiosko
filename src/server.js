// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";

import authRouter, { authenticateMiddleware } from "./auth.js";
import connectionsRouter from "./routes/connections.js";
import queryRouter from "./routes/query.js";
import logsRouter from "./routes/logs.js";
import usersRouter from "./routes/users.js";
import reportsRouter from "./routes/reports.js";

import startDailyAlert from "./jobs/dailyAlert.js";
import "./jobs/fixOfflineUpdatesJob.js";

// Create server
const app = express();

// CORS
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});


// Static file setup (React build only if exists)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.join(__dirname, "../client/build");

// Serve frontend static build only if folder exists
import fs from "fs";
const serveFrontend = fs.existsSync(buildPath);

if (serveFrontend) {
  console.log("✅ Serviendo frontend desde /client/build");
  app.use(express.static(buildPath));
} else {
  console.log("⚠️ No se encontró carpeta client/build — modo desarrollo backend");
}

// Public routes
app.use("/auth", authRouter);

// Protected routes
app.use(authenticateMiddleware);
app.use("/connections", connectionsRouter);
app.use("/query", queryRouter);
app.use("/logs", logsRouter);
app.use("/users", usersRouter);
app.use("/reports", reportsRouter);

// ✅ SPA fallback (debe ir al final, después de todas las rutas)
if (serveFrontend) {
  app.get("*", (req, res, next) => {
    // Evitar interceptar rutas API
    if (req.originalUrl.startsWith("/auth") || req.originalUrl.startsWith("/connections") ||
        req.originalUrl.startsWith("/query") || req.originalUrl.startsWith("/logs") ||
        req.originalUrl.startsWith("/users") || req.originalUrl.startsWith("/reports")) {
      return next();
    }
    res.sendFile(path.join(buildPath, "index.html"));
  });
}


// Cron jobs
startDailyAlert();

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
