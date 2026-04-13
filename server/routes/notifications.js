import { Router } from "express";
import dbConnect from "../db.js";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// GET user notifications
router.get("/", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT mark all as read
router.put("/", authenticate, async (req, res) => {
  try {
    await dbConnect();
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
