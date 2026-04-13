import { Router } from "express";
import dbConnect from "../db.js";
import Project from "../models/Project.js";
import Assignment from "../models/Assignment.js";
import { authenticate, adminOnly } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    await dbConnect();

    const period = req.query.period || "all";

    const projects = await Project.find();
    const assignments = await Assignment.find({ status: { $ne: "rejected" } });

    const now = new Date();
    const filteredProjects = projects.filter((p) => {
      if (period === "all") return true;
      const start = new Date(p.startDate);
      if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return start >= weekAgo;
      }
      if (period === "month") {
        return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      }
      if (period === "year") {
        return start.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const filteredProjectIds = new Set(filteredProjects.map((p) => p._id.toString()));
    const filteredAssignments = assignments.filter((a) =>
      filteredProjectIds.has(a.projectId.toString())
    );

    const totalRevenue = filteredProjects.reduce((sum, p) => sum + p.dealAmount, 0);
    const totalTrainerCost = filteredAssignments.reduce((sum, a) => sum + a.trainerCost, 0);
    const totalMiscCost = filteredProjects.reduce(
      (sum, p) => sum + (p.miscCosts || []).reduce((s, m) => s + m.amount, 0),
      0
    );
    const totalCost = totalTrainerCost + totalMiscCost;
    const totalProfit = totalRevenue - totalCost;

    const activeProjects = filteredProjects.filter((p) => p.status === "in-progress").length;
    const upcomingProjects = filteredProjects.filter((p) => p.status === "upcoming").length;
    const completedProjects = filteredProjects.filter((p) => p.status === "completed").length;

    // Monthly data for charts
    const monthlyData = {};
    projects.forEach((p) => {
      const month = new Date(p.startDate).toLocaleString("default", { month: "short", year: "numeric" });
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cost: 0, profit: 0 };
      monthlyData[month].revenue += p.dealAmount;
      const miscCost = (p.miscCosts || []).reduce((s, m) => s + m.amount, 0);
      monthlyData[month].cost += miscCost;
    });
    assignments.forEach((a) => {
      const project = projects.find((p) => p._id.toString() === a.projectId.toString());
      if (project) {
        const month = new Date(project.startDate).toLocaleString("default", { month: "short", year: "numeric" });
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cost: 0, profit: 0 };
        monthlyData[month].cost += a.trainerCost;
      }
    });
    Object.keys(monthlyData).forEach((m) => {
      monthlyData[m].profit = monthlyData[m].revenue - monthlyData[m].cost;
    });

    const chartData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Per-college summary
    const collegeData = {};
    filteredProjects.forEach((p) => {
      if (!collegeData[p.collegeName]) {
        collegeData[p.collegeName] = { revenue: 0, cost: 0, profit: 0, projects: 0 };
      }
      const projAssignments = filteredAssignments.filter(
        (a) => a.projectId.toString() === p._id.toString()
      );
      const trainerCost = projAssignments.reduce((s, a) => s + a.trainerCost, 0);
      const miscCost = (p.miscCosts || []).reduce((s, m) => s + m.amount, 0);
      const cost = trainerCost + miscCost;

      collegeData[p.collegeName].revenue += p.dealAmount;
      collegeData[p.collegeName].cost += cost;
      collegeData[p.collegeName].profit += p.dealAmount - cost;
      collegeData[p.collegeName].projects++;
    });

    const collegeSummary = Object.entries(collegeData)
      .map(([name, data]) => ({ collegeName: name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      totalRevenue,
      totalTrainerCost,
      totalMiscCost,
      totalCost,
      totalProfit,
      activeProjects,
      upcomingProjects,
      completedProjects,
      totalProjects: filteredProjects.length,
      totalColleges: new Set(filteredProjects.map((p) => p.collegeName)).size,
      chartData,
      collegeSummary,
      period,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
