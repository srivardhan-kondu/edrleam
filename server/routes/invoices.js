import { Router } from "express";
import dbConnect from "../db.js";
import Invoice from "../models/Invoice.js";
import Assignment from "../models/Assignment.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticate, adminOnly } from "../middleware/auth.js";

const router = Router();

const normalizePan = (value = "") => String(value).trim().toUpperCase();

// GET invoices (trainer: own invoices, admin: all invoices)
router.get("/", authenticate, async (req, res) => {
  try {
    await dbConnect();
    const { role, id: userId } = req.user;
    const { status } = req.query;

    const filter = {};
    if (role === "trainer") {
      filter.trainerId = userId;
    }
    if (status && ["raised", "approved", "cleared"].includes(String(status))) {
      filter.status = status;
    }

    const invoices = await Invoice.find(filter)
      .populate("projectId", "name collegeName startDate endDate")
      .populate("trainerId", "name email")
      .populate("assignmentId", "status completedAt")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST raise invoice (trainer only)
router.post("/", authenticate, async (req, res) => {
  try {
    await dbConnect();

    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainer access only" });
    }

    const {
      assignmentId,
      noOfDays,
      perDayCost,
      panNumber,
      travelToFroCost,
      otherExpenses,
    } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ error: "Assignment is required" });
    }

    const assignment = await Assignment.findById(assignmentId).populate(
      "projectId",
      "name collegeName endDate"
    );
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.trainerId.toString() !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (assignment.status !== "completed" || !assignment.completedAt) {
      return res.status(400).json({
        error: "Invoice can be raised only after assignment is marked completed",
      });
    }

    const existing = await Invoice.findOne({ assignmentId });
    if (existing) {
      return res.status(400).json({ error: "Invoice already raised for this assignment" });
    }

    const parsedDays = Number(noOfDays) || 0;
    const parsedPerDay = Number(perDayCost) || 0;
    const parsedTravel = Number(travelToFroCost) || 0;
    const parsedOther = Number(otherExpenses) || 0;
    const normalizedPan = normalizePan(panNumber);

    if (parsedDays <= 0 || parsedPerDay <= 0) {
      return res.status(400).json({ error: "No. of days and cost per day are required" });
    }
    if (!normalizedPan) {
      return res.status(400).json({ error: "PAN number is required" });
    }
    if (parsedTravel < 0 || parsedOther < 0) {
      return res.status(400).json({ error: "Expenses cannot be negative" });
    }

    const trainerCost = parsedDays * parsedPerDay;
    const totalAmount = trainerCost + parsedTravel + parsedOther;

    const invoice = await Invoice.create({
      assignmentId,
      projectId: assignment.projectId?._id,
      trainerId: req.user.id,
      noOfDays: parsedDays,
      perDayCost: parsedPerDay,
      trainerCost,
      panNumber: normalizedPan,
      travelToFroCost: parsedTravel,
      otherExpenses: parsedOther,
      totalAmount,
      status: "raised",
      raisedAt: new Date(),
    });

    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map((admin) => ({
          userId: admin._id,
          title: "Invoice Raised",
          message: `A trainer raised an invoice for ${assignment.projectId?.name || "a project"}.`,
          type: "financial",
          link: "/admin/invoices",
        }))
      );
    }

    const saved = await Invoice.findById(invoice._id)
      .populate("projectId", "name collegeName startDate endDate")
      .populate("trainerId", "name email")
      .populate("assignmentId", "status completedAt");

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update invoice status (admin only): raised -> approved -> cleared
router.put("/:id/status", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const { status, adminRemarks } = req.body;

    if (!["approved", "cleared"].includes(status)) {
      return res.status(400).json({ error: "Invalid invoice status" });
    }

    const invoice = await Invoice.findById(req.params.id)
      .populate("projectId", "name")
      .populate("trainerId", "_id name");
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (status === "approved" && invoice.status !== "raised") {
      return res.status(400).json({ error: "Only raised invoices can be approved" });
    }
    if (status === "cleared" && invoice.status !== "approved") {
      return res.status(400).json({ error: "Only approved invoices can be cleared" });
    }

    invoice.status = status;
    invoice.adminRemarks = typeof adminRemarks === "string" ? adminRemarks.trim() : invoice.adminRemarks;
    if (status === "approved") {
      invoice.approvedAt = new Date();
    }
    if (status === "cleared") {
      invoice.clearedAt = new Date();
    }
    await invoice.save();

    await Notification.create({
      userId: invoice.trainerId._id,
      title: status === "approved" ? "Invoice Approved" : "Invoice Cleared",
      message:
        status === "approved"
          ? `Your invoice for ${invoice.projectId?.name || "project"} was approved by admin.`
          : `Your invoice for ${invoice.projectId?.name || "project"} was cleared by admin.`,
      type: "financial",
      link: "/trainer/invoices",
    });

    const saved = await Invoice.findById(invoice._id)
      .populate("projectId", "name collegeName startDate endDate")
      .populate("trainerId", "name email")
      .populate("assignmentId", "status completedAt");

    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET trainer eligible completed assignments for invoice raising
router.get("/trainer/eligible", authenticate, async (req, res) => {
  try {
    await dbConnect();
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainer access only" });
    }

    const assignments = await Assignment.find({
      trainerId: req.user.id,
      status: "completed",
      completedAt: { $exists: true },
    })
      .populate("projectId", "name collegeName startDate endDate")
      .sort({ completedAt: -1 });

    const assignmentIds = assignments.map((a) => a._id);
    const existing = await Invoice.find({ assignmentId: { $in: assignmentIds } }).select("assignmentId");
    const existingSet = new Set(existing.map((e) => e.assignmentId.toString()));

    const eligible = assignments.map((a) => ({
      assignmentId: a._id,
      projectId: a.projectId?._id,
      projectName: a.projectId?.name || "",
      collegeName: a.projectId?.collegeName || "",
      completedAt: a.completedAt,
      suggestedNoOfDays: a.noOfDays || 0,
      suggestedPerDayCost: a.perDayCost || 0,
      canRaise: !existingSet.has(a._id.toString()),
    }));

    res.json(eligible);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;