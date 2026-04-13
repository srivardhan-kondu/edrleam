import { Router } from "express";
import dbConnect from "../db.js";
import Project from "../models/Project.js";
import Assignment from "../models/Assignment.js";
import Invoice from "../models/Invoice.js";
import { authenticate, adminOnly } from "../middleware/auth.js";

const router = Router();

const normalizeCollegeKey = (value = "") =>
  String(value)
    .replace(/\bphase\s*[-_]*\s*0*\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeCollegeDisplay = (value = "") =>
  normalizeCollegeKey(value).replace(/\b\w/g, (char) => char.toUpperCase());

// GET trainer college overview (college-centric grouping for trainer)
router.get("/trainer/overview", authenticate, async (req, res) => {
  try {
    await dbConnect();

    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainer access only" });
    }

    const assignments = await Assignment.find({ trainerId: req.user.id })
      .populate("projectId", "name collegeName description startDate endDate status skillsRequired")
      .sort({ createdAt: -1 });
    const invoices = await Invoice.find({ trainerId: req.user.id }).select(
      "assignmentId status totalAmount"
    );
    const invoiceByAssignment = new Map(
      invoices.map((invoice) => [invoice.assignmentId.toString(), invoice])
    );

    const collegeMap = {};

    assignments.forEach((a) => {
      const project = a.projectId;
      if (!project?.collegeName) return;

      const collegeKey = normalizeCollegeKey(project.collegeName);
      if (!collegeKey) return;

      if (!collegeMap[collegeKey]) {
        collegeMap[collegeKey] = {
          collegeName: normalizeCollegeDisplay(project.collegeName),
          projectCount: 0,
          assignmentCount: 0,
          totalEarnings: 0,
          activeAssignments: 0,
          completedAssignments: 0,
          lastAssignmentAt: a.createdAt,
          projectsMap: {},
        };
      }

      const noOfDays = Number(a.noOfDays || 0);
      const perDayCost = Number(a.perDayCost || 0);
      const trainerCost = Number(a.trainerCost || 0);
      const projectId = project._id.toString();
      const invoice = invoiceByAssignment.get(a._id.toString());

      collegeMap[collegeKey].assignmentCount += 1;
      if (invoice?.status === "cleared") {
        collegeMap[collegeKey].totalEarnings += Number(invoice.totalAmount || trainerCost);
      }
      if (["assigned", "accepted", "pending"].includes(a.status)) {
        collegeMap[collegeKey].activeAssignments += 1;
      }
      if (a.status === "completed") {
        collegeMap[collegeKey].completedAssignments += 1;
      }
      if (new Date(a.createdAt) > new Date(collegeMap[collegeKey].lastAssignmentAt)) {
        collegeMap[collegeKey].lastAssignmentAt = a.createdAt;
      }

      if (!collegeMap[collegeKey].projectsMap[projectId]) {
        collegeMap[collegeKey].projectsMap[projectId] = {
          projectId: project._id,
          projectName: project.name,
          projectDescription: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          skillsRequired: project.skillsRequired || [],
          cycleLabel: `${new Date(project.startDate).toLocaleString("default", { month: "short" })} ${new Date(project.startDate).getFullYear()}`,
          assignmentCount: 0,
          totalCost: 0,
          assignments: [],
        };
        collegeMap[collegeKey].projectCount += 1;
      }

      collegeMap[collegeKey].projectsMap[projectId].assignmentCount += 1;
      collegeMap[collegeKey].projectsMap[projectId].totalCost += trainerCost;
      collegeMap[collegeKey].projectsMap[projectId].assignments.push({
        assignmentId: a._id,
        status: a.status,
        invoiceStatus: invoice?.status || null,
        invoiceAmount: invoice ? Number(invoice.totalAmount || 0) : 0,
        notes: a.notes || "",
        noOfDays,
        perDayCost,
        trainerCost,
        assignedAt: a.createdAt,
        acceptedAt: a.acceptedAt,
        completedAt: a.completedAt,
      });
    });

    const result = Object.values(collegeMap)
      .map((c) => ({
        collegeName: c.collegeName,
        projectCount: c.projectCount,
        assignmentCount: c.assignmentCount,
        totalEarnings: c.totalEarnings,
        activeAssignments: c.activeAssignments,
        completedAssignments: c.completedAssignments,
        lastAssignmentAt: c.lastAssignmentAt,
        projects: Object.values(c.projectsMap).sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.lastAssignmentAt).getTime() - new Date(a.lastAssignmentAt).getTime());

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET one trainer college detail with all project cycles/tasks
router.get("/trainer/overview/:name", authenticate, async (req, res) => {
  try {
    await dbConnect();

    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainer access only" });
    }

    const requestedCollegeName = decodeURIComponent(req.params.name);
    const requestedCollegeKey = normalizeCollegeKey(requestedCollegeName);
    const assignments = await Assignment.find({ trainerId: req.user.id })
      .populate("projectId", "name collegeName description startDate endDate status skillsRequired contactPerson contactEmail contactPhone")
      .sort({ createdAt: -1 });
    const invoices = await Invoice.find({ trainerId: req.user.id }).select(
      "assignmentId status totalAmount"
    );
    const invoiceByAssignment = new Map(
      invoices.map((invoice) => [invoice.assignmentId.toString(), invoice])
    );

    const relevant = assignments.filter(
      (a) => normalizeCollegeKey(a.projectId?.collegeName) === requestedCollegeKey
    );
    if (relevant.length === 0) {
      return res.status(404).json({ error: "No assignments found for this college" });
    }

    const collegeName = normalizeCollegeDisplay(relevant[0]?.projectId?.collegeName || requestedCollegeName);

    const projectsMap = {};
    let totalEarnings = 0;
    let activeAssignments = 0;
    let completedAssignments = 0;

    relevant.forEach((a) => {
      const project = a.projectId;
      const projectId = project._id.toString();
      const noOfDays = Number(a.noOfDays || 0);
      const perDayCost = Number(a.perDayCost || 0);
      const trainerCost = Number(a.trainerCost || 0);
      const invoice = invoiceByAssignment.get(a._id.toString());

      if (invoice?.status === "cleared") {
        totalEarnings += Number(invoice.totalAmount || trainerCost);
      }
      if (["assigned", "accepted", "pending"].includes(a.status)) activeAssignments += 1;
      if (a.status === "completed") completedAssignments += 1;

      if (!projectsMap[projectId]) {
        projectsMap[projectId] = {
          projectId: project._id,
          projectName: project.name,
          collegeName: project.collegeName,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          cycleLabel: `${new Date(project.startDate).toLocaleString("default", { month: "short" })} ${new Date(project.startDate).getFullYear()}`,
          skillsRequired: project.skillsRequired || [],
          contact: {
            person: project.contactPerson,
            email: project.contactEmail,
            phone: project.contactPhone,
          },
          totalCost: 0,
          assignments: [],
        };
      }

      projectsMap[projectId].totalCost += trainerCost;
      projectsMap[projectId].assignments.push({
        assignmentId: a._id,
        status: a.status,
        invoiceStatus: invoice?.status || null,
        invoiceAmount: invoice ? Number(invoice.totalAmount || 0) : 0,
        notes: a.notes || "",
        noOfDays,
        perDayCost,
        trainerCost,
        toc: a.toc && a.toc.filepath ? { filename: a.toc.filename, filepath: a.toc.filepath, description: a.toc.description || "" } : null,
        assignedAt: a.createdAt,
        acceptedAt: a.acceptedAt,
        completedAt: a.completedAt,
      });
    });

    const projects = Object.values(projectsMap).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    res.json({
      collegeName,
      summary: {
        projectCount: projects.length,
        assignmentCount: relevant.length,
        totalEarnings,
        activeAssignments,
        completedAssignments,
      },
      projects,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all colleges (aggregated)
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const projects = await Project.find().sort({ createdAt: -1 });
    const assignments = await Assignment.find({ status: { $ne: "rejected" } });

    const collegeMap = {};

    projects.forEach((p) => {
      const key = p.collegeName;
      if (!collegeMap[key]) {
        collegeMap[key] = {
          collegeName: key,
          projects: [],
          totalRevenue: 0,
          totalTrainerCost: 0,
          totalMiscCost: 0,
          totalCost: 0,
          totalProfit: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTrainers: 0,
        };
      }

      const projAssignments = assignments.filter(
        (a) => a.projectId.toString() === p._id.toString()
      );
      const trainerCost = projAssignments.reduce((s, a) => s + a.trainerCost, 0);
      const miscCost = (p.miscCosts || []).reduce((s, m) => s + m.amount, 0);

      collegeMap[key].totalRevenue += p.dealAmount;
      collegeMap[key].totalTrainerCost += trainerCost;
      collegeMap[key].totalMiscCost += miscCost;
      collegeMap[key].totalCost += trainerCost + miscCost;
      collegeMap[key].totalProfit += p.dealAmount - trainerCost - miscCost;
      collegeMap[key].totalTrainers += projAssignments.length;

      if (p.status === "in-progress") collegeMap[key].activeProjects++;
      if (p.status === "completed") collegeMap[key].completedProjects++;

      collegeMap[key].projects.push({
        _id: p._id,
        name: p.name,
        dealAmount: p.dealAmount,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        trainerCost,
        miscCost,
        totalCost: trainerCost + miscCost,
        profit: p.dealAmount - trainerCost - miscCost,
        trainersCount: projAssignments.length,
      });
    });

    const colleges = Object.values(collegeMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    res.json(
      colleges.map((college) => ({
        ...college,
        projectCount: college.projects.length,
        profit: college.totalProfit,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single college detail
router.get("/:name", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();
    const collegeName = decodeURIComponent(req.params.name);

    const projects = await Project.find({ collegeName }).sort({ startDate: -1 });
    if (projects.length === 0) {
      return res.status(404).json({ error: "College not found" });
    }

    const projectIds = projects.map((p) => p._id);
    const assignments = await Assignment.find({
      projectId: { $in: projectIds },
    }).populate("trainerId", "name email phone skills ratePerDay");

    const projectDetails = projects.map((p) => {
      const projAssignments = assignments.filter(
        (a) => a.projectId.toString() === p._id.toString()
      );
      const activeAssignments = projAssignments.filter((a) => a.status !== "rejected");
      const trainerCost = activeAssignments.reduce((s, a) => s + a.trainerCost, 0);
      const miscCost = (p.miscCosts || []).reduce((s, m) => s + m.amount, 0);

      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        dealAmount: p.dealAmount,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        skillsRequired: p.skillsRequired,
        contactPerson: p.contactPerson,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        miscCosts: p.miscCosts || [],
        trainerCost,
        miscCost,
        miscCostTotal: miscCost,
        totalCost: trainerCost + miscCost,
        profit: p.dealAmount - trainerCost - miscCost,
        contact: {
          person: p.contactPerson,
          email: p.contactEmail,
          phone: p.contactPhone,
        },
        trainers: projAssignments
          .filter((a) => a.trainerId)
          .map((a) => ({
            id: a.trainerId._id,
            name: a.trainerId.name,
            email: a.trainerId.email,
            phone: a.trainerId.phone,
            skills: a.trainerId.skills || [],
            ratePerDay: a.trainerId.ratePerDay || 0,
            cost: a.trainerCost,
            status: a.status,
            assignmentId: a._id,
            assignedAt: a.createdAt,
            acceptedAt: a.acceptedAt,
            completedAt: a.completedAt,
          })),
        assignments: projAssignments.map((a) => ({
          _id: a._id,
          projectId: p._id,
          projectName: p.name,
          projectStatus: p.status,
          projectStartDate: p.startDate,
          projectEndDate: p.endDate,
          trainer: a.trainerId,
          trainerCost: a.trainerCost,
          status: a.status,
          notes: a.notes,
          assignedAt: a.createdAt,
          acceptedAt: a.acceptedAt,
          completedAt: a.completedAt,
        })),
      };
    });

    const totalRevenue = projects.reduce((s, p) => s + p.dealAmount, 0);
    const totalTrainerCost = projectDetails.reduce((s, p) => s + p.trainerCost, 0);
    const totalMiscCost = projectDetails.reduce((s, p) => s + p.miscCostTotal, 0);
    const totalCost = totalTrainerCost + totalMiscCost;
    const totalProfit = totalRevenue - totalCost;

    const trainerMap = {};
    assignments.forEach((a) => {
      const tid = a.trainerId?._id?.toString();
      if (!tid) return;

      const project = projects.find((p) => p._id.toString() === a.projectId.toString());
      if (!project) return;

      if (!trainerMap[tid]) {
        trainerMap[tid] = {
          id: a.trainerId._id,
          name: a.trainerId.name,
          email: a.trainerId.email,
          phone: a.trainerId.phone,
          skills: a.trainerId.skills || [],
          ratePerDay: a.trainerId.ratePerDay || 0,
          totalEarnings: 0,
          projectCount: 0,
          assignmentCount: 0,
          statusBreakdown: {
            assigned: 0,
            accepted: 0,
            completed: 0,
            rejected: 0,
            pending: 0,
          },
          lastAssignedAt: a.createdAt,
          projects: [],
        };
      }

      trainerMap[tid].assignmentCount += 1;
      trainerMap[tid].statusBreakdown[a.status] = (trainerMap[tid].statusBreakdown[a.status] || 0) + 1;
      trainerMap[tid].totalEarnings += a.status === "rejected" ? 0 : a.trainerCost;

      if (!trainerMap[tid].projects.some((p) => p.projectId.toString() === project._id.toString())) {
        trainerMap[tid].projectCount += 1;
      }

      trainerMap[tid].projects.push({
        projectId: project._id,
        projectName: project.name,
        projectStatus: project.status,
        cost: a.trainerCost,
        assignmentStatus: a.status,
        assignedAt: a.createdAt,
        acceptedAt: a.acceptedAt,
        completedAt: a.completedAt,
      });

      if (a.createdAt && (!trainerMap[tid].lastAssignedAt || new Date(a.createdAt) > new Date(trainerMap[tid].lastAssignedAt))) {
        trainerMap[tid].lastAssignedAt = a.createdAt;
      }
    });

    const assignmentLedger = projectDetails.flatMap((project) =>
      project.assignments.map((assignment) => ({
        assignmentId: assignment._id,
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        projectStatus: assignment.projectStatus,
        trainerId: assignment.trainer?._id,
        trainerName: assignment.trainer?.name || "Unknown",
        trainerEmail: assignment.trainer?.email || "",
        trainerPhone: assignment.trainer?.phone || "",
        trainerSkills: assignment.trainer?.skills || [],
        trainerCost: assignment.trainerCost,
        status: assignment.status,
        notes: assignment.notes,
        assignedAt: assignment.assignedAt,
        acceptedAt: assignment.acceptedAt,
        completedAt: assignment.completedAt,
      }))
    );

    const trainerInvoices = assignmentLedger.map((a, idx) => {
      let invoiceStatus = "issued";
      if (a.status === "accepted") invoiceStatus = "in-progress";
      if (a.status === "completed") invoiceStatus = "paid";
      if (a.status === "rejected") invoiceStatus = "void";

      return {
        invoiceId: `INV-TR-${String(idx + 1).padStart(4, "0")}`,
        kind: "trainer",
        collegeName,
        projectId: a.projectId,
        projectName: a.projectName,
        payeeType: "trainer",
        payeeName: a.trainerName,
        payeeEmail: a.trainerEmail,
        description: `Trainer cost for ${a.projectName}`,
        amount: a.trainerCost,
        status: invoiceStatus,
        issuedDate: a.assignedAt,
        dueDate: a.completedAt || a.acceptedAt || a.assignedAt,
        paidDate: a.status === "completed" ? a.completedAt : null,
      };
    });

    const miscInvoices = projectDetails.flatMap((p) =>
      (p.miscCosts || []).map((m, idx) => ({
        invoiceId: `INV-MI-${p._id.toString().slice(-4)}-${String(idx + 1).padStart(2, "0")}`,
        kind: "misc",
        collegeName,
        projectId: p._id,
        projectName: p.name,
        payeeType: "vendor",
        payeeName: m.description,
        payeeEmail: "",
        description: `Misc expense: ${m.description}`,
        amount: m.amount,
        status: p.status === "completed" ? "paid" : "issued",
        issuedDate: p.startDate,
        dueDate: p.endDate,
        paidDate: p.status === "completed" ? p.endDate : null,
      }))
    );

    const invoices = [...trainerInvoices, ...miscInvoices].sort(
      (a, b) => new Date(b.issuedDate || 0).getTime() - new Date(a.issuedDate || 0).getTime()
    );

    const toc = [
      { id: "deal", label: "Deal Value", type: "revenue", amount: totalRevenue },
      { id: "trainer", label: "Trainer Cost", type: "expense", amount: totalTrainerCost },
      { id: "misc", label: "Misc Cost", type: "expense", amount: totalMiscCost },
      { id: "total", label: "Total Cost", type: "expense", amount: totalCost },
      { id: "profit", label: "Net Profit", type: "profit", amount: totalProfit },
    ];

    res.json({
      collegeName,
      totalRevenue,
      totalTrainerCost,
      totalMiscCost,
      totalCost,
      profit: totalProfit,
      totalProfit,
      summary: {
        projectCount: projects.length,
        trainerCount: Object.keys(trainerMap).length,
        assignmentCount: assignments.length,
        activeProjects: projects.filter((p) => p.status === "in-progress").length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        totalRevenue,
        totalTrainerCost,
        totalMiscCost,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue ? (totalProfit / totalRevenue) * 100 : 0,
      },
      toc,
      projects: projectDetails,
      trainers: Object.values(trainerMap),
      assignmentLedger,
      invoices,
      generatedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
