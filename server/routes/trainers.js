import { Router } from "express";
import dbConnect from "../db.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticate, adminOnly } from "../middleware/auth.js";

const router = Router();

// GET all trainers
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const trainers = await User.find({ role: "trainer" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(trainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update trainer
router.put("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const trainer = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");

    if (req.body.status === "approved") {
      await Notification.create({
        userId: req.params.id,
        title: "Account Approved",
        message: "Your account has been approved by the admin. You can now receive project assignments.",
        type: "approval",
      });
    } else if (req.body.status === "rejected") {
      await Notification.create({
        userId: req.params.id,
        title: "Account Rejected",
        message: "Your account registration has been rejected. Please contact admin for details.",
        type: "approval",
      });
    }

    res.json(trainer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE trainer
router.delete("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Trainer deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
