// middleware/requireRole.js
import { requireAuth } from "./auth.js"; // tu middleware existente

export const requireRole = (role) => {
  return (req, res, next) => {
    // primero autenticación
    requireAuth(req, res, (err) => {
      if (err) return; // requireAuth ya habrá mandado la respuesta
      const user = req.user;
      if (!user) return res.status(401).json({ error: "No autorizado" });
      // si es Admin permite todo
      if (user.role === role || user.role === "Admin") {
        return next();
      }
      return res.status(403).json({ error: "Permisos insuficientes" });
    });
  };
};
