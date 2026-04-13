import { Router } from "express";
import dbConnect from "../db.js";
import Project from "../models/Project.js";
import Assignment from "../models/Assignment.js";
import Invoice from "../models/Invoice.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { validateIdParam, sanitizeString, isValidEmail, safeError } from "../middleware/validate.js";

const router = Router();

// Whitelist of allowed project fields
const ALLOWED_PROJECT_FIELDS = [
  "name", "collegeName", "description", "dealAmount", "startDate", "endDate",
  "status", "skillsRequired", "contactPerson", "contactEmail", "contactPhone", "miscCosts",
];

function normalizeCollegeName(name = "") {
  return sanitizeString(name)
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .substring(0, 200);
}

function buildSafePayload(body) {
  const payload = {};
  for (const key of ALLOWED_PROJECT_FIELDS) {
    if (body[key] !== undefined) {
      if (key === "name") {
        payload[key] = sanitizeString(String(body[key])).substring(0, 200);
      } else if (key === "collegeName") {
        payload[key] = normalizeCollegeName(body[key] || "");
      } else if (key === "description") {
        payload[key] = sanitizeString(String(body[key] || "")).substring(0, 2000);
      } else if (key === "dealAmount") {
        const amount = Number(body[key]);
        if (isNaN(amount) || amount < 0 || amount > 100000000) continue;
        payload[key] = amount;
      } else if (key === "startDate" || key === "endDate") {
        const d = new Date(body[key]);
        if (isNaN(d.getTime())) continue;
        payload[key] = d;
      } else if (key === "status") {
        if (!["upcoming", "in-progress", "completed", "cancelled"].includes(body[key])) continue;
        payload[key] = body[key];
      } else if (key === "skillsRequired") {
        payload[key] = Array.isArray(body[key])
          ? body[key].map((s) => sanitizeString(String(s)).substring(0, 50)).filter(Boolean).slice(0, 30)
          : [];
      } else if (key === "contactPerson") {
        payload[key] = sanitizeString(String(body[key] || "")).substring(0, 100);
      } else if (key === "contactEmail") {
        const email = String(body[key] || "").trim();
        payload[key] = isValidEmail(email) ? email : "";
      } else if (key === "contactPhone") {
        payload[key] = String(body[key] || "").trim().substring(0, 20);
      } else if (key === "miscCosts") {
        payload[key] = Array.isArray(body[key])
          ? body[key]
              .filter((m) => m && typeof m === "object")
              .map((m) => ({
                description: sanitizeString(String(m.description || "")).substring(0, 200),
                amount: Math.max(0, Math.min(Number(m.amount) || 0, 100000000)),
              }))
              .slice(0, 50)
          : [];
      }
    }
  }
  return payload;
}

// GET all projects
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    safeError(res, error);
  }
});

// POST create project
router.post("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const payload = buildSafePayload(req.body);
    if (!payload.name || !payload.collegeName) {
      return res.status(400).json({ error: "Project name and college name are required" });
    }
    const project = await Project.create(payload);
    res.status(201).json(project);
  } catch (error) {
    safeError(res, error);
  }
});

// GET single project with assignments — ROLE CHECK: trainers only see their own assignments
router.get("/:id", authenticate, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    let assignmentFilter = { projectId: req.params.id };
    // Trainers can only see their own assignments within the project
    if (req.user.role === "trainer") {
      assignmentFilter.trainerId = req.user.id;
    }

    const assignments = await Assignment.find(assignmentFilter).populate(
      "trainerId",
      "name email phone skills ratePerDay"
    );

    // For trainers, strip sensitive financial info from project
    if (req.user.role === "trainer") {
      const safeProject = {
        _id: project._id,
        name: project.name,
        collegeName: project.collegeName,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        skillsRequired: project.skillsRequired,
      };
      return res.json({ project: safeProject, assignments });
    }

    res.json({ project, assignments });
  } catch (error) {
    safeError(res, error);
  }
});

// PUT update project
router.put("/:id", authenticate, adminOnly, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    const payload = buildSafePayload(req.body);
    const project = await Project.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    safeError(res, error);
  }
});

// DELETE project — cascade delete assignments AND orphaned invoices
router.delete("/:id", authenticate, adminOnly, validateIdParam, async (req, res) => {
  try {
    await dbConnect();
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    // Cascade: delete invoices → assignments → project
    await Invoice.deleteMany({ projectId: req.params.id });
    await Assignment.deleteMany({ projectId: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (error) {
    safeError(res, error);
  }
});

export default router;
