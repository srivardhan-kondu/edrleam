import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/toc");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage — use cryptographically random filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use crypto random instead of predictable timestamp+Math.random
    const randomName = crypto.randomBytes(24).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    // Only allow safe extensions
    const safeExts = [".pdf", ".doc", ".docx"];
    const finalExt = safeExts.includes(ext) ? ext : ".pdf";
    cb(null, `${randomName}${finalExt}`);
  },
});

// File filter - only allow PDF and DOCX (validate MIME type)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are allowed"), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,                    // Only 1 file per request
  },
});

export { upload, uploadsDir };
