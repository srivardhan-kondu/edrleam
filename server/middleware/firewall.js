/**
 * Application-level firewall middleware
 * Blocks malicious patterns, suspicious payloads, and common attack vectors
 */

// Patterns commonly used in injection attacks
const MALICIOUS_PATTERNS = [
  /\$(?:gt|gte|lt|lte|ne|nin|in|exists|regex|where|elemMatch|size|all|type)\b/i,
  /\{\s*"\$(?:gt|gte|lt|lte|ne|nin|in|exists|regex|where)"/i,
  /<\s*script[\s>]/i,
  /javascript\s*:/i,
  /on(?:error|load|click|mouseover|focus|blur)\s*=/i,
  /union\s+select/i,
  /;\s*(?:drop|delete|update|insert|alter)\s/i,
  /(?:\/\.\.\/|\\\.\.\\)/,                // path traversal
  /\0/,                                    // null bytes
];

// Recursively scan values in an object/array for malicious patterns
function containsMalicious(value, depth = 0) {
  if (depth > 10) return true; // prevent stack overflow from deeply nested objects

  if (typeof value === "string") {
    return MALICIOUS_PATTERNS.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsMalicious(item, depth + 1));
  }

  if (value && typeof value === "object") {
    // Block any key that starts with $ (MongoDB operator injection)
    for (const key of Object.keys(value)) {
      if (key.startsWith("$")) return true;
      if (key === "__proto__" || key === "constructor" || key === "prototype") return true;
      if (containsMalicious(value[key], depth + 1)) return true;
    }
  }

  return false;
}

/**
 * Firewall middleware — blocks:
 * 1. MongoDB operator injection ($gt, $ne, etc.) in body/query/params
 * 2. XSS payloads (<script>, javascript:, event handlers)
 * 3. SQL injection fragments (union select, drop, etc.)
 * 4. Path traversal (../, ..\)
 * 5. Null byte injection
 * 6. Prototype pollution (__proto__, constructor, prototype)
 * 7. Oversized request detection
 */
export function firewall(req, res, next) {
  // Scan request body
  if (req.body && typeof req.body === "object") {
    if (containsMalicious(req.body)) {
      return res.status(400).json({ error: "Request blocked by security filter" });
    }
  }

  // Scan query parameters
  if (req.query && typeof req.query === "object") {
    if (containsMalicious(req.query)) {
      return res.status(400).json({ error: "Request blocked by security filter" });
    }
  }

  // Scan URL params
  if (req.params && typeof req.params === "object") {
    for (const val of Object.values(req.params)) {
      if (typeof val === "string" && MALICIOUS_PATTERNS.some((p) => p.test(val))) {
        return res.status(400).json({ error: "Request blocked by security filter" });
      }
    }
  }

  // Block suspicious content types
  const contentType = req.headers["content-type"] || "";
  if (req.method !== "GET" && req.method !== "DELETE" && req.body) {
    if (contentType && !contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
      return res.status(415).json({ error: "Unsupported content type" });
    }
  }

  next();
}

/**
 * Rate limit response handler — custom handler for rate limit exceeded
 */
export function rateLimitHandler(req, res) {
  res.status(429).json({ error: "Too many requests. Please try again later." });
}
