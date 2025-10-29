// src/jobs/dailyAlert.js
import cron from "node-cron";
import mgmtDb from "../db/adminDb.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

const schedule = process.env.ALERT_CRON_SCHEDULE || "0 8 * * *";

function startDailyAlert() {
  cron.schedule(schedule, async () => {
    try {
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0,0,0,0);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setHours(23,59,59,999);

      const logs = await mgmtDb("logs").whereBetween("created_at", [yesterdayStart.toISOString(), yesterdayEnd.toISOString()]).orderBy("created_at", "asc");

      if (!logs || logs.length === 0) {
        console.log("DailyAlert: no actions yesterday");
        return;
      }

      const summary = logs.map(l => `${l.created_at.toISOString()} | user:${l.user_id} | conn:${l.connection_id} | ${l.action} | affected:${l.affected_rows} | success:${l.success}`).join("\n");

      // enviar correo
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: process.env.ALERT_EMAIL_FROM,
          to: process.env.ALERT_EMAIL_TO,
          subject: `Acciones del ${yesterdayStart.toISOString().slice(0,10)}`,
          text: summary
        });
        console.log("DailyAlert: email enviado");
      } else {
        // fallback: imprimir
        console.log("DailyAlert report:\n", summary);
      }
    } catch (err) {
      console.error("DailyAlert error:", err);
    }
  }, { timezone: "America/Santiago" });
}

export default startDailyAlert;
