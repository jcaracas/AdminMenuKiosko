// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import authRouter, { authenticateMiddleware } from "./auth.js";
import connectionsRouter from "./routes/connections.js";
import queryRouter from "./routes/query.js";
import logsRouter from "./routes/logs.js";
import startDailyAlert from "./jobs/dailyAlert.js";

const app = express();

// 🔓 Habilita CORS para todas las rutas
app.use(cors());

app.use(express.json());

// open routes
app.use("/auth", authRouter);


// protect following
app.use(authenticateMiddleware);
app.use("/connections", connectionsRouter);
app.use("/query", queryRouter);
app.use("/logs", logsRouter);

// start job
startDailyAlert();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening ${PORT}`));
