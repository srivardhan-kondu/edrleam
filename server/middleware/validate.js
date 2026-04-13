import { Types } from "mongoose";

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id) {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === String(id);
}

/**
 * Middleware: validate that :id param is a valid ObjectId
 */
export function validateIdParam(req, res, next) {
  if (req.params.id && !isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  next();
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Validate PAN number format (Indian: 5 letters, 4 digits, 1 letter)
 */
export function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

/**
 * Validate phone number (basic: digits, spaces, dashes, plus, parens — 7-15 chars)
 */
export function isValidPhone(phone) {
  if (!phone) return true; // optional field
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

/**
 * Sanitize a string — strip HTML/script tags and trim
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")        // strip HTML tags
    .replace(/javascript\s*:/gi, "") // strip javascript: URIs
    .replace(/on\w+\s*=/gi, "")      // strip event handlers
    .trim();
}

/**
 * Safe error response — never leak internal details
 */
export function safeError(res, error, statusCode = 500) {
  console.error("Server error:", error);
  if (statusCode === 500) {
    return res.status(500).json({ error: "Internal server error" });
  }
  return res.status(statusCode).json({ error: error.message || "An error occurred" });
}
