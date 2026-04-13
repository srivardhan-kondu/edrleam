import { Router } from "express";
import dbConnect from "../db.js";
import Project from "../models/Project.js";
import Assignment from "../models/Assignment.js";
import { authenticate, adminOnly } from "../middleware/auth.js";

const router = Router();

function normalizeCollegeName(name = "") {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// GET all projects
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create project
router.post("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const payload = {
      ...req.body,
      collegeName: normalizeCollegeName(req.body.collegeName || ""),
    };
    const project = await Project.create(payload);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single project with assignments
router.get("/:id", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const assignments = await Assignment.find({ projectId: req.params.id }).populate(
      "trainerId",
      "name email phone skills ratePerDay"
    );

    res.json({ project, assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update project
router.put("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const payload = {
      ...req.body,
      collegeName: normalizeCollegeName(req.body.collegeName || ""),
    };
    const project = await Project.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    await Assignment.deleteMany({ projectId: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
