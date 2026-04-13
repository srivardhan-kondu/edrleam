import { Router } from "express";
import fs from "fs";
import dbConnect from "../db.js";
import Assignment from "../models/Assignment.js";
import Notification from "../models/Notification.js";
import Project from "../models/Project.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// POST create assignment (admin only)
router.post("/", authenticate, adminOnly, upload.single("toc"), async (req, res) => {
  try {
    await dbConnect();
    const { projectId, trainerId, noOfDays, perDayCost, trainerCost, notes, tocDescription } = req.body;

    const parsedNoOfDays = Number(noOfDays) || 0;
    const parsedPerDayCost = Number(perDayCost) || 0;
    const computedCost = parsedNoOfDays * parsedPerDayCost;
    const parsedTrainerCost = Number(trainerCost) || 0;
    const finalTrainerCost = computedCost > 0 ? computedCost : parsedTrainerCost;

    if (!projectId || !trainerId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Project and trainer are required" });
    }

    if (parsedNoOfDays <= 0 || parsedPerDayCost <= 0 || finalTrainerCost <= 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Days, per-day cost and total cost must be greater than 0" });
    }

    const existing = await Assignment.findOne({ projectId, trainerId });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Trainer already assigned to this project" });
    }

    const project = await Project.findById(projectId);

    // Prepare TOC data
    const tocData = req.file ? {
      filename: req.file.originalname,
      filepath: `/uploads/toc/${req.file.filename}`,
      uploadedAt: new Date(),
      description: tocDescription || "",
    } : {
      filename: null,
      filepath: null,
      uploadedAt: null,
      description: "",
    };

    const assignment = await Assignment.create({
      projectId,
      trainerId,
      noOfDays: parsedNoOfDays,
      perDayCost: parsedPerDayCost,
      trainerCost: finalTrainerCost,
      notes: notes || "",
      toc: tocData,
      status: "assigned",
    });

    await Notification.create({
      userId: trainerId,
      title: "New Project Assignment",
      message: `You have been assigned to "${project?.name}" at ${project?.collegeName}. ${parsedNoOfDays} day(s) x ₹${parsedPerDayCost.toLocaleString()}/day = ₹${finalTrainerCost.toLocaleString()}. ${req.file ? 'Table of Contents attached.' : ''} Please accept or reject.`,
      type: "assignment",
      link: `/trainer/assignments`,
    });

    res.status(201).json(assignment);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// GET assignments
router.get("/", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const { role, id: userId } = req.user;
    const { projectId } = req.query;

    let assignments;
    if (role === "admin") {
      const filter = projectId ? { projectId } : {};
      assignments = await Assignment.find(filter)
        .populate("projectId", "name collegeName dealAmount startDate endDate status")
        .populate("trainerId", "name email phone skills")
        .sort({ createdAt: -1 });
    } else {
      assignments = await Assignment.find({ trainerId: userId })
        .populate("projectId", "name collegeName dealAmount startDate endDate status description skillsRequired")
        .sort({ createdAt: -1 });
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update assignment status
router.put("/:id", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const { status } = req.body;
    const { role, id: userId } = req.user;

    const assignment = await Assignment.findById(req.params.id).populate("projectId", "name collegeName");
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (role === "trainer" && assignment.trainerId.toString() !== userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (role === "trainer" && !["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    assignment.status = status;
    if (status === "accepted") assignment.acceptedAt = new Date();
    
    // Handle completion - delete TOC file
    if (status === "completed") {
      assignment.completedAt = new Date();
      
      if (assignment.toc && assignment.toc.filepath) {
        try {
          const filePath = assignment.toc.filepath.replace(/^\/uploads\/toc\//, "");
          const fullPath = `./uploads/toc/${filePath}`;
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error("Error deleting TOC file:", err);
        }
      }
      
      // Clear TOC data
      assignment.toc = {
        filename: null,
        filepath: null,
        uploadedAt: null,
        description: "",
      };
    }
    
    await assignment.save();

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE assignment
router.delete("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Assignment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
