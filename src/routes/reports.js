// src/routes/reports.js
import express from "express";
import mgmtDb from "../db/adminDb.js";
import ExcelJS from "exceljs";

const router = express.Router();

function parseDateRange(q) {
  const today = new Date();

  // Si viene date_from o date_to, tratarlas como fechas locales (sin shift de zona)
  const parseLocalDate = (str) => {
    if (!str) return null;
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  let dateTo = parseLocalDate(q.date_to) || today;
  let dateFrom = parseLocalDate(q.date_from);

  if (!dateFrom) {
    dateFrom = new Date(dateTo);
    dateFrom.setDate(dateTo.getDate() - 13);
  }

  // 🔹 Forzar límites del día en horario local real
  dateFrom.setHours(0, 0, 0, 0);
  dateTo.setHours(23, 59, 59, 999);

  return { dateFrom, dateTo };
}


/**
 * 📊 GET /reports/incidence-by-day
 * Muestra agrupado por día y local, con los artículos OFF del período.
 */
router.get("/incidence-by-day", async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    
    const results = await mgmtDb("logs as l")
    .select(
      mgmtDb.raw(`date_trunc('day', l."created_at") as fecha`),
      mgmtDb.raw(`l."codLocal"`),
      mgmtDb.raw(`c."name" as "localName"`),
      mgmtDb.raw(`string_agg(distinct l."articuloCodigo"::text, ', ') as articulos`),
      mgmtDb.raw(`count(distinct l."articuloCodigo") as total_articulos`)
    )
    .leftJoin(
      "connections as c",
      mgmtDb.raw('CAST(c."codLocal" AS TEXT)'),
      "=",
      mgmtDb.raw('l."codLocal"')
    )
    .whereBetween("l.created_at", [dateFrom, dateTo])
    .andWhere("l.valorNuevo", false)
    .groupByRaw(`1, 2, 3`)
    .orderByRaw(`1 asc, 2 asc`);


    res.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /reports/incidence-by-day error:", err);
    res.status(500).json({ success: false, message: "Error generando reporte agrupado" });
  }
});

/**
 * 📤 GET /reports/export?type=by_grouped
 * Exporta el mismo reporte a Excel
 */
router.get("/export", async (req, res) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const type = req.query.type || "locales";

    let rows = [];

    if (type === "by_grouped") {
      rows = await mgmtDb("logs as l")
        .select(
          mgmtDb.raw(`date_trunc('day', l."created_at") as fecha`),
          mgmtDb.raw(`l."codLocal"`),
          mgmtDb.raw(`c."name" as "localName"`),
          mgmtDb.raw(`string_agg(distinct l."articuloCodigo"::text, ', ') as articulos`),
          mgmtDb.raw(`count(distinct l."articuloCodigo") as total_articulos`)
        )
        .leftJoin(
          "connections as c",
          mgmtDb.raw('CAST(c."codLocal" AS TEXT)'),
          "=",
          mgmtDb.raw('l."codLocal"')
        )
        .whereBetween("l.created_at", [dateFrom, dateTo])
        .andWhere("l.valorNuevo", false)
        .groupByRaw(`1, 2, 3`)
        .orderByRaw(`1 asc, 2 asc`);

    } else {
      return res.status(400).json({ success: false, message: "Tipo de export no soportado" });
    }

    // Crear archivo Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte agrupado");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "CodLocal", key: "codLocal", width: 15 },
      { header: "Local", key: "localName", width: 30 },
      { header: "Artículos OFF", key: "articulos", width: 60 },
      { header: "Total OFF", key: "total_articulos", width: 12 },
    ];

    rows.forEach((r) =>
      sheet.addRow({
        fecha: new Date(r.fecha).toISOString().slice(0, 10),
        codLocal: r.codLocal,
        localName: r.localName || "(sin nombre)",
        articulos: r.articulos,
        total_articulos: r.total_articulos,
      })
    );

    sheet.getRow(1).font = { bold: true };

    const fileName = `reporte_OFF_agrupado_${dateFrom.toISOString().slice(0, 10)}_a_${dateTo
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("GET /reports/export error:", err);
    res.status(500).json({ success: false, message: "Error exportando reporte" });
  }
});

export default router;
