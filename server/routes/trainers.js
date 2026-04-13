import { Router } from "express";
import dbConnect from "../db.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { validateIdParam, sanitizeString, safeError } from "../middleware/validate.js";

const router = Router();

// Whitelist of fields admin is allowed to update on a trainer
const ALLOWED_TRAINER_FIELDS = ["status", "ratePerDay", "phone", "skills", "experience"];

// GET all trainers
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const trainers = await User.find({ role: "trainer" })
      .select("-password -loginAttempts -lockUntil -tokenVersion")
      .sort({ createdAt: -1 });
    res.json(trainers);
  } catch (error) {
    safeError(res, error);
  }
});

// PUT update trainer — STRICT field whitelisting
router.put("/:id", authenticate, adminOnly, validateIdParam, async (req, res) => {
  try {
    await dbConnect();

    // Only allow whitelisted fields — block role, password, email, tokenVersion, etc.
    const updates = {};
    for (const key of ALLOWED_TRAINER_FIELDS) {
      if (req.body[key] !== undefined) {
        if (key === "status" && !["pending", "approved", "rejected"].includes(req.body[key])) {
          return res.status(400).json({ error: "Invalid status value" });
        }
        if (key === "ratePerDay") {
          const rate = Number(req.body[key]);
          if (isNaN(rate) || rate < 0 || rate > 1000000) {
            return res.status(400).json({ error: "Invalid rate value" });
          }
          updates[key] = rate;
        } else if (key === "skills" && Array.isArray(req.body[key])) {
          updates[key] = req.body[key].map((s) => sanitizeString(String(s)).substring(0, 50)).filter(Boolean).slice(0, 20);
        } else if (key === "phone") {
          updates[key] = String(req.body[key] || "").trim().substring(0, 20);
        } else if (key === "experience") {
          updates[key] = sanitizeString(String(req.body[key] || "")).substring(0, 500);
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Verify target is actually a trainer (prevent admin account modification)
    const target = await User.findById(req.params.id);
    if (!target || target.role !== "trainer") {
      return res.status(404).json({ error: "Trainer not found" });
    }

    const trainer = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select("-password -loginAttempts -lockUntil -tokenVersion");

    if (updates.status === "approved") {
      await Notification.create({
        userId: req.params.id,
        title: "Account Approved",
        message: "Your account has been approved by the admin. You can now receive project assignments.",
        type: "approval",
      });
    } else if (updates.status === "rejected") {
      // Increment tokenVersion to force logout of rejected trainer
      await User.findByIdAndUpdate(req.params.id, { $inc: { tokenVersion: 1 } });
      await Notification.create({
        userId: req.params.id,
        title: "Account Rejected",
        message: "Your account registration has been rejected. Please contact admin for details.",
        type: "approval",
      });
    }

    res.json(trainer);
  } catch (error) {
    safeError(res, error);
  }
});

// DELETE trainer
router.delete("/:id", authenticate, adminOnly, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    // Verify target is a trainer, not an admin
    const target = await User.findById(req.params.id);
    if (!target || target.role !== "trainer") {
      return res.status(404).json({ error: "Trainer not found" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Trainer deleted" });
  } catch (error) {
    safeError(res, error);
  }
});

export default router;
