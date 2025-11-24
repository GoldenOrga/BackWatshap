import jwt from "jsonwebtoken";
import * as Sentry from "@sentry/node";

const auth = (req, res, next) => {
  // 🔥 Bypass en test pour les tests unitaires
  if (process.env.NODE_ENV === "test") {
    req.user = { id: req.headers["x-user-id"] || "test-user" }; // facultatif : override si besoin
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    Sentry.setUser(null);
    return res.status(401).json({ message: "Token requis ou malformé" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: verified.id };
    Sentry.setUser({ id: verified.id?.toString() });
    next();
  } catch (err) {
    Sentry.setUser(null);
    return res.status(401).json({ message: "Token invalide" });
  }
};

export default auth;
