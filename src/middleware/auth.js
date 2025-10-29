import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    // 🔹 Usa tu clave secreta (manténla en una variable de entorno)
    const secret = process.env.JWT_SECRET || "clave_super_segura";

    const decoded = jwt.verify(token, secret);

    // Guardamos los datos del usuario en el request
    req.user = decoded;

    next();
  } catch (err) {
    console.error("Error de autenticación:", err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};
