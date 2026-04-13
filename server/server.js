import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import path from "path";
import { fileURLToPath } from "url";

import { firewall } from "./middleware/firewall.js";
import { authenticate } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import assignmentRoutes from "./routes/assignments.js";
import trainerRoutes from "./routes/trainers.js";
import collegeRoutes from "./routes/colleges.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificationRoutes from "./routes/notifications.js";
import invoiceRoutes from "./routes/invoices.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── SECURITY: Validate required environment variables on startup ───
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];
for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY: Helmet HTTP headers ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],        // prevent clickjacking
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  dnsPrefetchControl: { allow: false },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

// ─── SECURITY: HTTPS redirect in production ───
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.header("x-forwarded-proto") !== "https") {
    return res.redirect(301, `https://${req.header("host")}${req.url}`);
  }
  next();
});

// ─── SECURITY: CORS — locked to exact domains only ───
const defaultOrigins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:5001"];
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      // In production, block requests with no origin (prevents sandboxed iframe attacks)
      // In development, allow for Postman/curl/server-to-server
      if (!origin) {
        if (process.env.NODE_ENV === "production") {
          return callback(new Error("Origin header required"));
        }
        return callback(null, true);
      }
      // Check exact match against whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow the specific Vercel deployment URL (set VERCEL_URL env var on Render)
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl && origin === vercelUrl) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// ─── SECURITY: Body parsing with strict size limits ───
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ─── SECURITY: MongoDB operator injection prevention ───
app.use(mongoSanitize({ replaceWith: "_" }));

// ─── SECURITY: HTTP parameter pollution protection ───
app.use(hpp());

// ─── SECURITY: Application firewall (XSS, injection, traversal) ───
app.use(firewall);

// ─── SECURITY: Global rate limiter — 100 requests per 15 min per IP ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many requests. Please try again later." }),
});
app.use("/api/", globalLimiter);

// ─── SECURITY: Strict rate limiter for auth endpoints ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many authentication attempts. Try again later." }),
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── SECURITY: Uploads served behind authentication ───
app.use("/uploads", authenticate, express.static(path.join(__dirname, "uploads")));

// ─── API Routes ───
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invoices", invoiceRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── SECURITY: Catch-all — no information leakage on unknown routes ───
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── SECURITY: Global error handler — never leak stack traces ───
app.use((err, req, res, _next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled error:", err.message);
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
