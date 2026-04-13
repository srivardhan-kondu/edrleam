import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText, Download } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface AssignmentItem {
  assignmentId: string;
  status: string;
  invoiceStatus?: "raised" | "approved" | "cleared" | null;
  invoiceAmount?: number;
  notes: string;
  noOfDays: number;
  perDayCost: number;
  trainerCost: number;
  toc?: { filename: string; filepath: string; description: string } | null;
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

interface ProjectCycle {
  projectId: string;
  projectName: string;
  collegeName: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  cycleLabel: string;
  skillsRequired: string[];
  contact: { person?: string; email?: string; phone?: string };
  totalCost: number;
  assignments: AssignmentItem[];
}

interface CollegeDetail {
  collegeName: string;
  summary: {
    projectCount: number;
    assignmentCount: number;
    totalEarnings: number;
    activeAssignments: number;
    completedAssignments: number;
  };
  projects: ProjectCycle[];
}

interface InvoiceItem {
  _id: string;
  assignmentId: { _id: string; status: string; completedAt?: string };
  projectId: { _id: string; name: string; collegeName: string };
  noOfDays: number;
  perDayCost: number;
  trainerCost: number;
  panNumber: string;
  travelToFroCost: number;
  otherExpenses: number;
  totalAmount: number;
  status: "raised" | "approved" | "cleared";
}

interface InvoiceDraft {
  noOfDays: string;
  perDayCost: string;
  panNumber: string;
  travelToCost: string;
  travelFroCost: string;
  otherExpenses: string;
}

const assignmentStatusColors: Record<string, string> = {
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

const projectStatusColors: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const invoiceStatusColors: Record<string, string> = {
  raised: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  cleared: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const normalizeCollege = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export default function TrainerCollegeDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [data, setData] = useState<CollegeDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, InvoiceDraft>>({});
  const [savingAssignmentId, setSavingAssignmentId] = useState("");
  const [selectedPhaseProjectId, setSelectedPhaseProjectId] = useState("all");
  const [taskMode, setTaskMode] = useState<"action" | "all">("action");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!name) return;
    try {
      const [collegeRes, invoicesRes] = await Promise.all([
        fetch(`/api/colleges/trainer/overview/${encodeURIComponent(name)}`, { headers: authHeaders() }),
        fetch("/api/invoices", { headers: authHeaders() }),
      ]);

      const collegePayload = await collegeRes.json();
      const invoicesPayload = await invoicesRes.json();

      if (!collegeRes.ok) throw new Error(collegePayload.error || "Failed to load college details");
      if (!invoicesRes.ok) throw new Error(invoicesPayload.error || "Failed to load invoices");

      const college = collegePayload as CollegeDetail;
      const invoiceList = (Array.isArray(invoicesPayload) ? invoicesPayload : []).filter(
        (inv: InvoiceItem) =>
          normalizeCollege(inv.projectId?.collegeName) === normalizeCollege(college.collegeName)
      );

      setData(college);
      setInvoices(invoiceList);
      setError("");

      const nextDrafts: Record<string, InvoiceDraft> = {};
      college.projects.forEach((project) => {
        project.assignments.forEach((assignment) => {
          nextDrafts[assignment.assignmentId] = {
            noOfDays: String(assignment.noOfDays || ""),
            perDayCost: String(assignment.perDayCost || ""),
            panNumber: "",
            travelToCost: "0",
            travelFroCost: "0",
            otherExpenses: "0",
          };
        });
      });
      setDrafts(nextDrafts);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load college details";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [name]);

  const invoiceByAssignment = useMemo(() => {
    const map: Record<string, InvoiceItem> = {};
    invoices.forEach((inv) => {
      const assignmentId = inv.assignmentId?._id;
      if (assignmentId) map[assignmentId] = inv;
    });
    return map;
  }, [invoices]);

  const phaseProjects = useMemo(
    () => [...(data?.projects || [])].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [data?.projects]
  );

  const phaseOptions = useMemo(
    () =>
      phaseProjects.map((project, index) => ({
        projectId: project.projectId,
        label: `Phase ${String(index + 1).padStart(2, "0")}`,
        subtitle: project.projectName,
      })),
    [phaseProjects]
  );

  useEffect(() => {
    if (selectedPhaseProjectId === "all") return;
    const valid = phaseOptions.some((phase) => phase.projectId === selectedPhaseProjectId);
    if (!valid) setSelectedPhaseProjectId("all");
  }, [phaseOptions, selectedPhaseProjectId]);

  const selectedPhaseLabel =
    selectedPhaseProjectId === "all"
      ? "All Phases"
      : phaseOptions.find((phase) => phase.projectId === selectedPhaseProjectId)?.label || "Selected Phase";

  const filteredProjects = useMemo(() => {
    const projects = data?.projects || [];
    const scoped =
      selectedPhaseProjectId === "all"
        ? projects
        : projects.filter((project) => project.projectId === selectedPhaseProjectId);

    if (taskMode === "all") return scoped;

    const actionableStatuses = new Set(["assigned", "pending", "accepted"]);
    return scoped.filter((project) =>
      project.assignments.some((assignment) => {
        if (actionableStatuses.has(assignment.status)) return true;
        const assignmentInvoice = invoiceByAssignment[assignment.assignmentId];
        if (assignment.status === "completed" && !assignmentInvoice) return true;
        if (assignmentInvoice && assignmentInvoice.status !== "cleared") return true;
        return false;
      })
    );
  }, [data?.projects, selectedPhaseProjectId, taskMode, invoiceByAssignment]);

  const scopeSummary = useMemo(() => {
    const projects = filteredProjects;
    const assignments = projects.flatMap((project) => project.assignments);
    const actionableStatuses = new Set(["assigned", "pending", "accepted"]);
    const actionCount = assignments.filter((assignment) => {
      if (actionableStatuses.has(assignment.status)) return true;
      const assignmentInvoice = invoiceByAssignment[assignment.assignmentId];
      if (assignment.status === "completed" && !assignmentInvoice) return true;
      if (assignmentInvoice && assignmentInvoice.status !== "cleared") return true;
      return false;
    }).length;
    return {
      projects: projects.length,
      assignments: assignments.length,
      actions: actionCount,
    };
  }, [filteredProjects, invoiceByAssignment]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/assignments/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const onDraftChange = (assignmentId: string, key: keyof InvoiceDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] || {
          noOfDays: "",
          perDayCost: "",
          panNumber: "",
          travelToCost: "0",
          travelFroCost: "0",
          otherExpenses: "0",
        }),
        [key]: value,
      },
    }));
  };

  const raiseInvoice = async (assignment: AssignmentItem) => {
    const draft = drafts[assignment.assignmentId];
    if (!draft) return;

    try {
      setSavingAssignmentId(assignment.assignmentId);
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          assignmentId: assignment.assignmentId,
          noOfDays: Number(draft.noOfDays || 0),
          perDayCost: Number(draft.perDayCost || 0),
          panNumber: draft.panNumber,
          travelToFroCost:
            Number(draft.travelToCost || 0) + Number(draft.travelFroCost || 0),
          otherExpenses: Number(draft.otherExpenses || 0),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to raise invoice");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to raise invoice";
      setError(message);
    } finally {
      setSavingAssignmentId("");
    }
  };

  const renderProgress = (status: "raised" | "approved" | "cleared") => {
    const doneIndex = status === "raised" ? 0 : status === "approved" ? 1 : 2;
    const labels = ["Invoice Raised", "Invoice Approved", "Invoice Cleared"];

    return (
      <div className="space-y-1 mt-2">
        {labels.map((label, index) => {
          const done = index <= doneIndex;
          return (
            <div key={label} className="flex items-center gap-2 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${done ? "bg-emerald-500" : "bg-gray-300"}`} />
              <span className={done ? "text-gray-700 font-medium" : "text-gray-400"}>{label}</span>
              <span className={`ml-auto ${done ? "text-emerald-600" : "text-amber-600"}`}>
                {done ? "completed" : "pending"}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  if (error || !data) {
    return (
      <div className="animate-fade-in bg-white border border-red-200 rounded-xl p-16 text-center">
        <p className="text-sm text-red-700 font-medium">{error || "Failed to load college details"}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/trainer/colleges" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="pl-6 sm:pl-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{data.collegeName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">All your project cycles and tasks under one college roof</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Project Cycles</div>
          <div className="text-lg font-bold text-gray-900">{data.summary.projectCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Assignments</div>
          <div className="text-lg font-bold text-gray-900">{data.summary.assignmentCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Active</div>
          <div className="text-lg font-bold text-blue-600">{data.summary.activeAssignments}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Completed</div>
          <div className="text-lg font-bold text-emerald-600">{data.summary.completedAssignments}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Cleared Earnings</div>
          <div className="text-lg font-bold text-gray-900">₹{data.summary.totalEarnings.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">Phase Command Center</h2>
            <p className="text-[12px] text-gray-500 mt-1">Choose one phase and focus only on what needs your action.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 w-full lg:w-auto">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Phase</p>
              <select
                value={selectedPhaseProjectId}
                onChange={(e) => setSelectedPhaseProjectId(e.target.value)}
                className="w-full lg:w-[260px] border border-gray-300 rounded-md px-2.5 py-2 text-[12px]"
              >
                <option value="all">All Phases</option>
                {phaseOptions.map((phase) => (
                  <option key={phase.projectId} value={phase.projectId}>{phase.label} - {phase.subtitle}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Tasks</p>
              <select
                value={taskMode}
                onChange={(e) => setTaskMode(e.target.value as "action" | "all")}
                className="w-full lg:w-[180px] border border-gray-300 rounded-md px-2.5 py-2 text-[12px]"
              >
                <option value="action">Action Required</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Scope</p>
            <p className="text-[14px] font-semibold text-gray-900">{selectedPhaseLabel}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Project Cycles</p>
            <p className="text-[14px] font-semibold text-gray-900">{scopeSummary.projects}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Assignments</p>
            <p className="text-[14px] font-semibold text-gray-900">{scopeSummary.assignments}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Action Required</p>
            <p className="text-[14px] font-semibold text-gray-900">{scopeSummary.actions}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-[13px] text-gray-500">No project cycles found for current filter.</p>
          </div>
        ) : filteredProjects.map((project) => (
          <div key={project.projectId} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-[15px]">{project.projectName}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${projectStatusColors[project.status] || projectStatusColors.cancelled}`}>{project.status}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">Cycle: {project.cycleLabel}</span>
                </div>
                <p className="text-[13px] text-gray-500 mt-1">{project.description || "No description"}</p>
                <div className="text-[12px] text-gray-500 mt-2 flex items-center gap-2">
                  <CalendarDays size={13} />
                  <span>{new Date(project.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} — {new Date(project.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {project.skillsRequired?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.skillsRequired.map((skill) => (
                      <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Your Total for Cycle</p>
                <p className="text-[16px] font-bold text-gray-900">₹{project.totalCost.toLocaleString()}</p>
              </div>
            </div>

            {(project.contact?.person || project.contact?.email || project.contact?.phone) && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-[12px] text-gray-600 grid sm:grid-cols-3 gap-2">
                <p><span className="text-gray-400">Contact:</span> {project.contact?.person || "-"}</p>
                <p><span className="text-gray-400">Email:</span> {project.contact?.email || "-"}</p>
                <p><span className="text-gray-400">Phone:</span> {project.contact?.phone || "-"}</p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Tasks / Assignments</h4>
              <div className="space-y-2">
                {(taskMode === "all"
                  ? project.assignments
                  : project.assignments.filter((assignment) => {
                      if (["assigned", "pending", "accepted"].includes(assignment.status)) return true;
                      const assignmentInvoice = invoiceByAssignment[assignment.assignmentId];
                      if (assignment.status === "completed" && !assignmentInvoice) return true;
                      if (assignmentInvoice && assignmentInvoice.status !== "cleared") return true;
                      return false;
                    })
                ).map((a) => {
                  const invoice = invoiceByAssignment[a.assignmentId];
                  const draft = drafts[a.assignmentId] || {
                    noOfDays: String(a.noOfDays || ""),
                    perDayCost: String(a.perDayCost || ""),
                    panNumber: "",
                    travelToCost: "0",
                    travelFroCost: "0",
                    otherExpenses: "0",
                  };

                  const days = Number(draft.noOfDays || 0);
                  const perDay = Number(draft.perDayCost || 0);
                  const travelTo = Number(draft.travelToCost || 0);
                  const travelFro = Number(draft.travelFroCost || 0);
                  const travel = travelTo + travelFro;
                  const other = Number(draft.otherExpenses || 0);
                  const computedTotal = days * perDay + travel + other;

                  return (
                    <div key={a.assignmentId} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${assignmentStatusColors[a.status] || assignmentStatusColors.assigned}`}>{a.status}</span>
                          <p className="text-[12px] text-gray-600 mt-1">{a.noOfDays || 0} day(s) × ₹{(a.perDayCost || 0).toLocaleString()}/day = <span className="font-semibold text-gray-900">₹{a.trainerCost.toLocaleString()}</span></p>
                          {a.notes && <p className="text-[12px] text-gray-500 mt-1 italic">{a.notes}</p>}
                          <p className="text-[11px] text-gray-500 mt-1">Assigned on {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString("en-IN") : "-"}</p>
                          {/* TOC Download */}
                          {a.toc && a.toc.filepath && (
                            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <FileText size={14} className="text-blue-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-blue-900 truncate">{a.toc.filename}</p>
                                {a.toc.description && <p className="text-[11px] text-blue-700 truncate">{a.toc.description}</p>}
                              </div>
                              <a
                                href={`http://localhost:5001${a.toc.filepath}`}
                                download={a.toc.filename}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-blue-600 hover:text-blue-700 rounded-md hover:bg-blue-100 transition-colors shrink-0"
                                title="Download TOC"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(a.status === "assigned" || a.status === "pending") && (
                            <>
                              <button onClick={() => updateStatus(a.assignmentId, "accepted")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Accept</button>
                              <button onClick={() => updateStatus(a.assignmentId, "rejected")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Reject</button>
                            </>
                          )}
                          {a.status === "accepted" && (
                            <button onClick={() => updateStatus(a.assignmentId, "completed")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Complete</button>
                          )}
                        </div>
                      </div>

                      {a.status === "completed" && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Invoice</p>

                          {invoice ? (
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${invoiceStatusColors[invoice.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{invoice.status}</span>
                                <p className="text-[12px] text-gray-700 font-semibold">Total: ₹{invoice.totalAmount.toLocaleString()}</p>
                              </div>
                              <p className="text-[12px] text-gray-600 mt-1">{invoice.noOfDays} day(s) × ₹{invoice.perDayCost.toLocaleString()} + travel ₹{invoice.travelToFroCost.toLocaleString()} + other ₹{invoice.otherExpenses.toLocaleString()}</p>
                              {renderProgress(invoice.status)}
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-[12px]">
                                  <thead>
                                    <tr className="text-gray-500 uppercase tracking-wider text-[10px]">
                                      <th className="text-left pr-2 pb-1">No. of Days</th>
                                      <th className="text-left pr-2 pb-1">Cost/Day</th>
                                      <th className="text-left pr-2 pb-1">PAN Number</th>
                                      <th className="text-left pr-2 pb-1">Travel To</th>
                                      <th className="text-left pr-2 pb-1">Travel Fro</th>
                                      <th className="text-left pr-2 pb-1">Miscellaneous</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="pr-2">
                                        <input type="number" min={1} value={draft.noOfDays} onChange={(e) => onDraftChange(a.assignmentId, "noOfDays", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1" />
                                      </td>
                                      <td className="pr-2">
                                        <input type="number" min={1} value={draft.perDayCost} onChange={(e) => onDraftChange(a.assignmentId, "perDayCost", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1" />
                                      </td>
                                      <td className="pr-2">
                                        <input type="text" value={draft.panNumber} onChange={(e) => onDraftChange(a.assignmentId, "panNumber", e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded-md px-2 py-1 uppercase" maxLength={20} />
                                      </td>
                                      <td className="pr-2">
                                        <input type="number" min={0} value={draft.travelToCost} onChange={(e) => onDraftChange(a.assignmentId, "travelToCost", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1" />
                                      </td>
                                      <td className="pr-2">
                                        <input type="number" min={0} value={draft.travelFroCost} onChange={(e) => onDraftChange(a.assignmentId, "travelFroCost", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1" />
                                      </td>
                                      <td>
                                        <input type="number" min={0} value={draft.otherExpenses} onChange={(e) => onDraftChange(a.assignmentId, "otherExpenses", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1" />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <p className="text-[12px] text-gray-700">Computed total: <span className="font-semibold text-gray-900">₹{computedTotal.toLocaleString()}</span> <span className="text-gray-500">(Travel To + Fro = ₹{travel.toLocaleString()})</span></p>
                                <button onClick={() => raiseInvoice(a)} disabled={savingAssignmentId === a.assignmentId} className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                  {savingAssignmentId === a.assignmentId ? "Raising..." : "Raise Invoice"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {((taskMode === "all"
                  ? project.assignments
                  : project.assignments.filter((assignment) => {
                      if (["assigned", "pending", "accepted"].includes(assignment.status)) return true;
                      const assignmentInvoice = invoiceByAssignment[assignment.assignmentId];
                      if (assignment.status === "completed" && !assignmentInvoice) return true;
                      if (assignmentInvoice && assignmentInvoice.status !== "cleared") return true;
                      return false;
                    })
                ).length === 0) && (
                  <p className="text-[12px] text-gray-500">No assignments in this project for current filter.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
