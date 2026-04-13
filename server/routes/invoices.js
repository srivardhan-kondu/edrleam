import { Router } from "express";
import dbConnect from "../db.js";
import Invoice from "../models/Invoice.js";
import Assignment from "../models/Assignment.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { validateIdParam, isValidObjectId, isValidPAN, sanitizeString, safeError } from "../middleware/validate.js";

const router = Router();

/**
 * Mask PAN number for non-essential display: ABCDE1234F → A****234F
 */
function maskPAN(pan) {
  if (!pan || pan.length < 10) return "****";
  return pan[0] + "****" + pan.substring(5);
}

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

    // Mask PAN numbers in response — only show full PAN to the trainer who owns it
    const safeInvoices = invoices.map((inv) => {
      const obj = inv.toObject();
      if (role === "admin") {
        obj.panNumber = maskPAN(obj.panNumber);
      }
      return obj;
    });

    res.json(safeInvoices);
  } catch (error) {
    safeError(res, error);
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

    if (!assignmentId || !isValidObjectId(assignmentId)) {
      return res.status(400).json({ error: "Valid assignment ID is required" });
    }

    const assignment = await Assignment.findById(assignmentId).populate(
      "projectId",
      "name collegeName endDate"
    );
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.trainerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
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

    // Validate numeric inputs — reject non-numeric values instead of silently coercing
    if (noOfDays == null || noOfDays === "" || isNaN(Number(noOfDays))) {
      return res.status(400).json({ error: "noOfDays must be a valid number" });
    }
    if (perDayCost == null || perDayCost === "" || isNaN(Number(perDayCost))) {
      return res.status(400).json({ error: "perDayCost must be a valid number" });
    }
    const parsedDays = Number(noOfDays);
    const parsedPerDay = Number(perDayCost);
    const parsedTravel = Number(travelToFroCost) || 0;
    const parsedOther = Number(otherExpenses) || 0;
    const normalizedPan = String(panNumber || "").trim().toUpperCase();

    if (parsedDays <= 0 || parsedPerDay <= 0) {
      return res.status(400).json({ error: "No. of days and cost per day are required" });
    }

    // Cross-validate against assignment — prevent inflated invoices
    // Validate TOTAL amount (not individual fields) to prevent combined-field fraud
    const assignmentTotal = assignment.noOfDays * assignment.perDayCost;
    const invoiceTotal = parsedDays * parsedPerDay;
    const maxTotal = Math.ceil(assignmentTotal * 1.05); // 5% tolerance only
    if (invoiceTotal > maxTotal) {
      return res.status(400).json({ error: `Invoice total (₹${invoiceTotal}) exceeds assignment total (₹${assignmentTotal})` });
    }
    // Also cap individual fields at assignment values (no single-field inflation)
    if (parsedDays > assignment.noOfDays) {
      return res.status(400).json({ error: `Days cannot exceed assignment days (${assignment.noOfDays})` });
    }
    if (parsedPerDay > assignment.perDayCost) {
      return res.status(400).json({ error: `Per-day cost cannot exceed assignment rate (₹${assignment.perDayCost})` });
    }

    // Validate PAN format
    if (!isValidPAN(normalizedPan)) {
      return res.status(400).json({ error: "Invalid PAN number format (expected: ABCDE1234F)" });
    }

    if (parsedTravel < 0 || parsedOther < 0) {
      return res.status(400).json({ error: "Expenses cannot be negative" });
    }
    // Cap expenses to reasonable amounts
    if (parsedTravel > 1000000 || parsedOther > 1000000) {
      return res.status(400).json({ error: "Expense amounts exceed maximum limit" });
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
          message: `A trainer raised an invoice for ${sanitizeString(assignment.projectId?.name || "a project")}.`,
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
    safeError(res, error);
  }
});

// PUT update invoice status (admin only): raised -> approved -> cleared
router.put("/:id/status", authenticate, adminOnly, validateIdParam, async (req, res) => {
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
    invoice.adminRemarks = typeof adminRemarks === "string" ? sanitizeString(adminRemarks).substring(0, 500) : invoice.adminRemarks;
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
          ? `Your invoice for ${sanitizeString(invoice.projectId?.name || "project")} was approved by admin.`
          : `Your invoice for ${sanitizeString(invoice.projectId?.name || "project")} was cleared by admin.`,
      type: "financial",
      link: "/trainer/invoices",
    });

    const saved = await Invoice.findById(invoice._id)
      .populate("projectId", "name collegeName startDate endDate")
      .populate("trainerId", "name email")
      .populate("assignmentId", "status completedAt");

    // Mask PAN in response
    const result = saved.toObject();
    result.panNumber = maskPAN(result.panNumber);
    res.json(result);
  } catch (error) {
    safeError(res, error);
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
    safeError(res, error);
  }
});

export default router;