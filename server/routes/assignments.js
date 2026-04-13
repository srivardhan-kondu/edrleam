import { Router } from "express";
import fs from "fs";
import path from "path";
import dbConnect from "../db.js";
import Assignment from "../models/Assignment.js";
import Notification from "../models/Notification.js";
import Project from "../models/Project.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validateIdParam, isValidObjectId, sanitizeString, safeError } from "../middleware/validate.js";

const router = Router();

// Valid state transitions for assignments
const VALID_TRANSITIONS = {
  assigned: ["accepted", "rejected"],
  accepted: ["completed"],
  // rejected and completed are terminal states
};

// POST create assignment (admin only)
router.post("/", authenticate, adminOnly, upload.single("toc"), async (req, res) => {
  try {
    await dbConnect();
    const { projectId, trainerId, noOfDays, perDayCost, trainerCost, notes, tocDescription } = req.body;

    // Validate ObjectIds
    if (!projectId || !trainerId || !isValidObjectId(projectId) || !isValidObjectId(trainerId)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Valid project and trainer IDs are required" });
    }

    const parsedNoOfDays = Number(noOfDays) || 0;
    const parsedPerDayCost = Number(perDayCost) || 0;
    const computedCost = parsedNoOfDays * parsedPerDayCost;
    const parsedTrainerCost = Number(trainerCost) || 0;
    const finalTrainerCost = computedCost > 0 ? computedCost : parsedTrainerCost;

    if (parsedNoOfDays <= 0 || parsedNoOfDays > 365 || parsedPerDayCost <= 0 || parsedPerDayCost > 1000000 || finalTrainerCost <= 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Days (1-365), per-day cost, and total cost must be valid positive numbers" });
    }

    const existing = await Assignment.findOne({ projectId, trainerId });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Trainer already assigned to this project" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Project not found" });
    }

    // Prepare TOC data — sanitize description
    const tocData = req.file ? {
      filename: path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100),
      filepath: `/uploads/toc/${req.file.filename}`,
      uploadedAt: new Date(),
      description: sanitizeString(String(tocDescription || "")).substring(0, 500),
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
      notes: sanitizeString(String(notes || "")).substring(0, 1000),
      toc: tocData,
      status: "assigned",
    });

    await Notification.create({
      userId: trainerId,
      title: "New Project Assignment",
      message: `You have been assigned to "${sanitizeString(project.name)}" at ${sanitizeString(project.collegeName)}. ${parsedNoOfDays} day(s). Please accept or reject.`,
      type: "assignment",
      link: `/trainer/assignments`,
    });

    res.status(201).json(assignment);
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore cleanup error */ }
    }
    safeError(res, error);
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
      const filter = (projectId && isValidObjectId(projectId)) ? { projectId } : {};
      assignments = await Assignment.find(filter)
        .populate("projectId", "name collegeName dealAmount startDate endDate status")
        .populate("trainerId", "name email phone skills")
        .sort({ createdAt: -1 });
    } else {
      assignments = await Assignment.find({ trainerId: userId })
        .populate("projectId", "name collegeName startDate endDate status description skillsRequired")
        .sort({ createdAt: -1 });
    }

    res.json(assignments);
  } catch (error) {
    safeError(res, error);
  }
});

// PUT update assignment status — STRICT state machine
router.put("/:id", authenticate, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    const { status } = req.body;
    const { role, id: userId } = req.user;

    const assignment = await Assignment.findById(req.params.id).populate("projectId", "name collegeName");
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Trainers can only modify their own assignments
    if (role === "trainer" && assignment.trainerId.toString() !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate status value
    if (role === "trainer" && !["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Enforce state machine — prevent invalid transitions
    const currentStatus = assignment.status;
    const allowedNextStates = VALID_TRANSITIONS[currentStatus];
    if (!allowedNextStates || !allowedNextStates.includes(status)) {
      return res.status(400).json({ error: `Cannot change status from "${currentStatus}" to "${status}"` });
    }

    assignment.status = status;
    if (status === "accepted") assignment.acceptedAt = new Date();
    
    // Handle completion — safely delete TOC file
    if (status === "completed") {
      assignment.completedAt = new Date();
      
      if (assignment.toc && assignment.toc.filepath) {
        try {
          // Only allow deletion within the uploads/toc directory
          const safeName = path.basename(assignment.toc.filepath);
          const fullPath = path.join(process.cwd(), "uploads", "toc", safeName);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error("Error deleting TOC file:", err.message);
        }
      }
      
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
    safeError(res, error);
  }
});

// DELETE assignment
router.delete("/:id", authenticate, adminOnly, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Assignment deleted" });
  } catch (error) {
    safeError(res, error);
  }
});

export default router;
