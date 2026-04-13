import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "../db.js";
import User from "../models/User.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { isValidEmail, isValidPhone, sanitizeString, safeError } from "../middleware/validate.js";

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const TOKEN_EXPIRY = "24h"; // Reduced from 7d for security

function validatePasswordStrength(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be less than 128 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character (!@#$%^&*)";
  return null;
}

// Login
router.post("/login", async (req, res) => {
  try {
    await dbConnect();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate email format before querying DB
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
        locked: true,
        lockUntil: user.lockUntil,
      });
    }

    // Reset lock if expired
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION);
        await user.save();
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for 15 minutes.`,
          locked: true,
          lockUntil: user.lockUntil,
        });
      }
      await user.save();
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
      return res.status(401).json({
        error: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft > 1 ? "s" : ""} remaining.`,
      });
    }

    if (user.role === "trainer" && user.status !== "approved") {
      return res.status(401).json({ error: "Account not approved yet" });
    }

    // Reset login attempts on success
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role, tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    safeError(res, error);
  }
});

// Register (trainer)
router.post("/register", async (req, res) => {
  try {
    await dbConnect();
    const { name, email, password, confirmPassword, phone, skills, experience } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Validate & sanitize inputs
    const cleanName = sanitizeString(name).substring(0, 100);
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }
    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Sanitize array inputs
    const cleanSkills = Array.isArray(skills)
      ? skills.map((s) => sanitizeString(String(s)).substring(0, 50)).filter(Boolean).slice(0, 20)
      : [];

    await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? String(phone).trim().substring(0, 20) : "",
      skills: cleanSkills,
      experience: sanitizeString(String(experience || "")).substring(0, 500),
      role: "trainer",
      status: "pending",
    });

    res.status(201).json({ message: "Registration successful. Waiting for admin approval." });
  } catch (error) {
    safeError(res, error);
  }
});

// Admin change password
router.put("/change-password", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    const pwError = validatePasswordStrength(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Issue new token with updated version
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ message: "Password changed successfully", token });
  } catch (error) {
    safeError(res, error);
  }
});

// Get current user (tokenVersion already validated in authenticate middleware)
router.get("/me", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const user = await User.findById(req.user.id).select("-password -loginAttempts -lockUntil -tokenVersion");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    safeError(res, error);
  }
});

export default router;
