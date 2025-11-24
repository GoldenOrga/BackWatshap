import jwt from "jsonwebtoken";
import * as Sentry from "@sentry/node";

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    Sentry.setUser(null);
    return res.status(401).json({ message: "Token requis ou malformé" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: verified.id };
    const currentUser = JSON.parse(localStorage.getItem("user")) || null;
    Sentry.setUser({
      id: verified.id?.toString(),
      email: currentUser?.email,
      name: currentUser?.name,
    });

    next();
  } catch (err) {
    Sentry.setUser(null);
    return res.status(401).json({ message: "Token invalide" });
  }
};

export default auth;