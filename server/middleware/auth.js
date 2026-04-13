import jwt from "jsonwebtoken";
import dbConnect from "../db.js";
import User from "../models/User.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify token version AND user status against database on every request
    await dbConnect();
    const user = await User.findById(decoded.id).select("role status tokenVersion");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Block if token version changed (password was changed / session revoked)
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    // Block rejected/pending trainers immediately (not just at login)
    if (user.role === "trainer" && user.status !== "approved") {
      return res.status(403).json({ error: "Account access revoked. Contact admin." });
    }

    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
