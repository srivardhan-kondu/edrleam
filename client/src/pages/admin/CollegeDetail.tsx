import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  FolderKanban,
  Users,
  ClipboardList,
  FileText,
  Mail,
  Phone,
  BadgeIndianRupee,
} from "lucide-react";
import { authHeaders } from "../../lib/api";

interface CollegeProject {
  _id: string; name: string; dealAmount: number; status: string;
  startDate: string; endDate: string; trainerCost: number; miscCost: number;
  profit: number;
  skillsRequired?: string[];
  description?: string;
  contact?: { person?: string; email?: string; phone?: string };
  miscCosts?: { _id?: string; description: string; amount: number }[];
  trainers: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    skills?: string[];
    ratePerDay?: number;
    cost: number;
    status?: string;
    assignmentId?: string;
    assignedAt?: string;
    acceptedAt?: string;
    completedAt?: string;
  }[];
}

interface TrainerSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skills?: string[];
  ratePerDay?: number;
  totalEarnings: number;
  projectCount: number;
  assignmentCount: number;
  statusBreakdown: Record<string, number>;
  lastAssignedAt?: string;
  projects: {
    projectId: string;
    projectName: string;
    projectStatus: string;
    cost: number;
    assignmentStatus: string;
    assignedAt?: string;
    acceptedAt?: string;
    completedAt?: string;
  }[];
}

interface AssignmentLedgerItem {
  assignmentId: string;
  projectId: string;
  projectName: string;
  trainerName: string;
  trainerEmail?: string;
  trainerPhone?: string;
  trainerSkills?: string[];
  trainerCost: number;
  status: string;
  notes?: string;
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
}

interface InvoiceItem {
  _id: string;
  assignmentId: { _id: string; status: string; completedAt?: string };
  projectId: { _id: string; name: string; collegeName: string };
  trainerId: { _id: string; name: string; email?: string };
  noOfDays: number;
  perDayCost: number;
  trainerCost: number;
  panNumber: string;
  travelToFroCost: number;
  otherExpenses: number;
  totalAmount: number;
  status: "raised" | "approved" | "cleared";
  raisedAt?: string;
  approvedAt?: string;
  clearedAt?: string;
}

interface TocItem {
  id: string;
  label: string;
  type: "revenue" | "expense" | "profit";
  amount: number;
}

interface CollegeData {
  collegeName: string; totalRevenue: number; totalTrainerCost: number;
  totalMiscCost: number; totalCost: number; profit: number; projects: CollegeProject[];
  summary?: {
    projectCount: number;
    trainerCount: number;
    assignmentCount: number;
    activeProjects: number;
    completedProjects: number;
    totalRevenue: number;
    totalTrainerCost: number;
    totalMiscCost: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
  };
  toc?: TocItem[];
  trainers?: TrainerSummary[];
  assignmentLedger?: AssignmentLedgerItem[];
}

const normalizeCollege = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const statusColors: Record<string, string> = {
  "completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  "upcoming": "bg-amber-50 text-amber-700 border-amber-200",
  "cancelled": "bg-gray-100 text-gray-500 border-gray-200",
};

export default function CollegeDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [data, setData] = useState<CollegeData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoiceActionLoading, setInvoiceActionLoading] = useState("");
  const [selectedPhaseProjectId, setSelectedPhaseProjectId] = useState("all");
  const [assignmentMode, setAssignmentMode] = useState<"action" | "all">("action");
  const [invoiceMode, setInvoiceMode] = useState<"open" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!name) return;
    Promise.all([
      fetch(`/api/colleges/${encodeURIComponent(name)}`, { headers: authHeaders() }),
      fetch("/api/invoices", { headers: authHeaders() }),
    ])
      .then(async ([collegeRes, invoicesRes]) => {
        const collegePayload = await collegeRes.json();
        const invoicesPayload = await invoicesRes.json();
        if (!collegeRes.ok) throw new Error(collegePayload.error || "Failed to load college details");
        if (!invoicesRes.ok) throw new Error(invoicesPayload.error || "Failed to load invoices");

        const collegeData = collegePayload as CollegeData;
        const invoiceList = (Array.isArray(invoicesPayload) ? invoicesPayload : []).filter(
          (invoice: InvoiceItem) =>
            normalizeCollege(invoice.projectId?.collegeName) === normalizeCollege(collegeData.collegeName)
        );

        setData(collegeData);
        setInvoices(invoiceList);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load college details");
        setLoading(false);
      });
  }, [name]);

  const updateInvoiceStatus = async (id: string, status: "approved" | "cleared") => {
    try {
      setInvoiceActionLoading(id);
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update invoice");

      setInvoices((prev) =>
        prev.map((invoice) => (invoice._id === id ? payload : invoice))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update invoice";
      setError(message);
    } finally {
      setInvoiceActionLoading("");
    }
  };

  const projects = data?.projects || [];
  const summary = data?.summary || {
    projectCount: projects.length,
    trainerCount: data?.trainers?.length || 0,
    assignmentCount: data?.assignmentLedger?.length || 0,
    activeProjects: projects.filter((p) => p.status === "in-progress").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    totalRevenue: data?.totalRevenue || 0,
    totalTrainerCost: data?.totalTrainerCost || 0,
    totalMiscCost: data?.totalMiscCost || 0,
    totalCost: data?.totalCost || 0,
    totalProfit: data?.profit || 0,
    profitMargin: data?.totalRevenue ? ((data?.profit || 0) / data.totalRevenue) * 100 : 0,
  };

  const toc = data?.toc || [];
  const trainerList = data?.trainers || [];
  const assignmentLedger = data?.assignmentLedger || [];

  const phaseProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [projects]
  );

  const phaseOptions = useMemo(
    () => phaseProjects.map((project, index) => ({
      projectId: project._id,
      label: `Phase ${String(index + 1).padStart(2, "0")}`,
      subtitle: project.name,
    })),
    [phaseProjects]
  );

  useEffect(() => {
    if (selectedPhaseProjectId === "all") return;
    const valid = phaseOptions.some((phase) => phase.projectId === selectedPhaseProjectId);
    if (!valid) {
      setSelectedPhaseProjectId("all");
    }
  }, [phaseOptions, selectedPhaseProjectId]);

  const selectedPhaseLabel =
    selectedPhaseProjectId === "all"
      ? "All Phases"
      : phaseOptions.find((phase) => phase.projectId === selectedPhaseProjectId)?.label || "Selected Phase";

  const filteredProjectIds = useMemo(() => {
    if (selectedPhaseProjectId === "all") {
      return new Set(projects.map((project) => project._id));
    }
    return new Set([selectedPhaseProjectId]);
  }, [projects, selectedPhaseProjectId]);

  const filteredProjects = projects.filter((project) => filteredProjectIds.has(project._id));

  const actionableAssignmentStatuses = new Set(["assigned", "pending", "accepted"]);
  const filteredAssignmentLedger = assignmentLedger.filter((item) => {
    if (!filteredProjectIds.has(item.projectId)) return false;
    if (assignmentMode === "action") return actionableAssignmentStatuses.has(item.status);
    return true;
  });

  const filteredInvoices = invoices.filter((invoice) => {
    if (!filteredProjectIds.has(invoice.projectId?._id)) return false;
    if (invoiceMode === "open") return invoice.status === "raised" || invoice.status === "approved";
    return true;
  });

  const filteredTrainerList = trainerList.filter((trainer) =>
    trainer.projects?.some((project) => filteredProjectIds.has(project.projectId))
  );

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  if (error || !data) {
    return (
      <div className="animate-fade-in bg-white border border-red-200 rounded-xl p-16 text-center">
        <p className="text-sm text-red-700 font-medium">{error || "Failed to load college details"}</p>
      </div>
    );
  }
  const invoiceStatusColors: Record<string, string> = {
    cleared: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    raised: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const assignmentStatusColors: Record<string, string> = {
    assigned: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/colleges" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="pl-6 sm:pl-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{data.collegeName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">All project, trainer, TOC, and invoice details under one roof</p>
        </div>
      </div>

      {/* Phase Command Center */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">Phase Command Center</h2>
            <p className="text-[12px] text-gray-500 mt-1">Filter one phase at a time to avoid noise while handling assignments and invoices.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 w-full lg:w-auto">
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Assignments</p>
              <select
                value={assignmentMode}
                onChange={(e) => setAssignmentMode(e.target.value as "action" | "all")}
                className="w-full lg:w-[170px] border border-gray-300 rounded-md px-2.5 py-2 text-[12px]"
              >
                <option value="action">Action Required</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Invoices</p>
              <select
                value={invoiceMode}
                onChange={(e) => setInvoiceMode(e.target.value as "open" | "all")}
                className="w-full lg:w-[170px] border border-gray-300 rounded-md px-2.5 py-2 text-[12px]"
              >
                <option value="open">Open Only</option>
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
            <p className="text-[11px] text-gray-500">Projects</p>
            <p className="text-[14px] font-semibold text-gray-900">{filteredProjects.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Assignments</p>
            <p className="text-[14px] font-semibold text-gray-900">{filteredAssignmentLedger.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500">Invoices</p>
            <p className="text-[14px] font-semibold text-gray-900">{filteredInvoices.length}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Revenue</span></div>
          <p className="text-lg font-bold text-gray-900">₹{data.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Users size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Trainer Cost</span></div>
          <p className="text-lg font-bold text-gray-900">₹{data.totalTrainerCost.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><FolderKanban size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Misc Cost</span></div>
          <p className="text-lg font-bold text-gray-900">₹{data.totalMiscCost.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><BadgeIndianRupee size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Total Cost</span></div>
          <p className="text-lg font-bold text-gray-900">₹{(data.totalCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Profit</span></div>
          <p className={`text-lg font-bold ${(data.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{(data.profit || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Users size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Trainers</span></div>
          <p className="text-lg font-bold text-gray-900">{summary.trainerCount}</p>
          <p className="text-[11px] text-gray-500">{summary.assignmentCount} assignments</p>
        </div>
      </div>

      {/* TOC */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-[14px] font-semibold text-gray-900 mb-3">TOC (Total Ownership Cost)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {toc.map((item) => (
            <div key={item.id} className="border border-gray-100 rounded-lg p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{item.label}</p>
              <p className={`text-[16px] font-bold mt-1 ${item.type === "profit" ? (item.amount >= 0 ? "text-emerald-600" : "text-red-600") : item.type === "expense" ? "text-amber-700" : "text-gray-900"}`}>
                ₹{item.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-gray-500 mt-3">Profit Margin: <span className="font-semibold text-gray-800">{summary.profitMargin.toFixed(2)}%</span></p>
      </div>

      {/* Trainers Directory */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-[14px] font-semibold text-gray-900 mb-4">Assigned Trainers and Details</h2>
        {filteredTrainerList.length === 0 ? (
          <p className="text-[13px] text-gray-500">No trainers found for {selectedPhaseLabel}.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {filteredTrainerList.map((trainer) => (
              <div key={trainer.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{trainer.name}</p>
                    {trainer.email && <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1"><Mail size={12} />{trainer.email}</p>}
                    {trainer.phone && <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={12} />{trainer.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider">Total Earnings</p>
                    <p className="text-[14px] font-bold text-gray-900">₹{trainer.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
                {trainer.skills && trainer.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {trainer.skills.map((skill) => (
                      <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium">{skill}</span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                  <div className="bg-gray-50 rounded-md p-2"><p className="text-gray-400">Projects</p><p className="font-semibold text-gray-800">{trainer.projectCount}</p></div>
                  <div className="bg-gray-50 rounded-md p-2"><p className="text-gray-400">Assignments</p><p className="font-semibold text-gray-800">{trainer.assignmentCount}</p></div>
                  <div className="bg-gray-50 rounded-md p-2"><p className="text-gray-400">Rate/Day</p><p className="font-semibold text-gray-800">₹{(trainer.ratePerDay || 0).toLocaleString()}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4"><ClipboardList size={16} className="text-gray-500" /><h2 className="text-[14px] font-semibold text-gray-900">Assignment Ledger</h2></div>
        {filteredAssignmentLedger.length === 0 ? (
          <p className="text-[13px] text-gray-500">No assignments found for current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="text-left py-2 pr-3">Project</th>
                  <th className="text-left py-2 pr-3">Trainer</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-right py-2 pr-3">Cost</th>
                  <th className="text-left py-2 pr-3">Assigned</th>
                  <th className="text-left py-2 pr-3">Accepted</th>
                  <th className="text-left py-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignmentLedger.map((item) => (
                  <tr key={item.assignmentId} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3 text-gray-800 font-medium">{item.projectName}</td>
                    <td className="py-2.5 pr-3">
                      <p className="text-gray-800 font-medium">{item.trainerName}</p>
                      <p className="text-gray-500">{item.trainerEmail || "-"}</p>
                    </td>
                    <td className="py-2.5 pr-3"><span className={`px-2 py-0.5 rounded-md border font-semibold ${assignmentStatusColors[item.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{item.status}</span></td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">₹{item.trainerCost.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{item.assignedAt ? new Date(item.assignedAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{item.acceptedAt ? new Date(item.acceptedAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2.5 text-gray-600">{item.completedAt ? new Date(item.completedAt).toLocaleDateString("en-IN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4"><FileText size={16} className="text-gray-500" /><h2 className="text-[14px] font-semibold text-gray-900">Invoice Ledger</h2></div>
        {filteredInvoices.length === 0 ? (
          <p className="text-[13px] text-gray-500">No invoices found for current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[950px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="text-left py-2 pr-3">Project</th>
                  <th className="text-left py-2 pr-3">Trainer</th>
                  <th className="text-left py-2 pr-3">PAN</th>
                  <th className="text-left py-2 pr-3">Breakdown</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Raised</th>
                  <th className="text-left py-2 pr-3">Approved</th>
                  <th className="text-left py-2 pr-3">Cleared</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3 text-gray-800">{inv.projectId?.name || "-"}</td>
                    <td className="py-2.5 pr-3"><p className="text-gray-800">{inv.trainerId?.name || "-"}</p><p className="text-gray-500">{inv.trainerId?.email || "-"}</p></td>
                    <td className="py-2.5 pr-3 font-mono text-gray-700">{inv.panNumber || "-"}</td>
                    <td className="py-2.5 pr-3 text-gray-700">{inv.noOfDays}d x ₹{inv.perDayCost.toLocaleString()} + travel ₹{inv.travelToFroCost.toLocaleString()} + other ₹{inv.otherExpenses.toLocaleString()}</td>
                    <td className="py-2.5 pr-3"><span className={`px-2 py-0.5 rounded-md border font-semibold ${invoiceStatusColors[inv.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{inv.status}</span></td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">₹{inv.totalAmount.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.raisedAt ? new Date(inv.raisedAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.approvedAt ? new Date(inv.approvedAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.clearedAt ? new Date(inv.clearedAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {inv.status === "raised" && (
                          <button
                            type="button"
                            disabled={invoiceActionLoading === inv._id}
                            onClick={() => updateInvoiceStatus(inv._id, "approved")}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {inv.status === "approved" && (
                          <button
                            type="button"
                            disabled={invoiceActionLoading === inv._id}
                            onClick={() => updateInvoiceStatus(inv._id, "cleared")}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Clear
                          </button>
                        )}
                        {inv.status === "cleared" && <span className="text-[11px] text-emerald-600 font-semibold">Done</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="space-y-3">
        {filteredProjects.map((p) => (
          <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Link to={`/admin/projects/${p._id}`} className="font-semibold text-gray-900 text-[15px] hover:text-indigo-600 transition-colors">{p.name}</Link>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[p.status] || statusColors.cancelled}`}>{p.status}</span>
                </div>
                {p.description && <p className="text-[12px] text-gray-500 mt-1">{p.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[12px] text-gray-500 flex-wrap">
                  <span>{new Date(p.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} — {new Date(p.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {p.skillsRequired && p.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.skillsRequired.map((skill) => (
                      <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-[14px] font-bold text-gray-900">₹{p.dealAmount.toLocaleString()}</p>
                <p className={`text-[12px] font-medium mt-0.5 ${p.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Profit: ₹{p.profit.toLocaleString()}</p>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-[12px]">
              <div><span className="text-gray-400">Deal:</span> <span className="font-medium text-gray-700">₹{p.dealAmount.toLocaleString()}</span></div>
              <div><span className="text-gray-400">Trainer:</span> <span className="font-medium text-gray-700">₹{p.trainerCost.toLocaleString()}</span></div>
              <div><span className="text-gray-400">Misc:</span> <span className="font-medium text-gray-700">₹{p.miscCost.toLocaleString()}</span></div>
            </div>

            {(p.contact?.person || p.contact?.email || p.contact?.phone) && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-[12px] text-gray-600 grid sm:grid-cols-3 gap-2">
                <p><span className="text-gray-400">Contact:</span> {p.contact?.person || "-"}</p>
                <p><span className="text-gray-400">Email:</span> {p.contact?.email || "-"}</p>
                <p><span className="text-gray-400">Phone:</span> {p.contact?.phone || "-"}</p>
              </div>
            )}

            {p.miscCosts && p.miscCosts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Misc Cost Items</p>
                <div className="space-y-1">
                  {p.miscCosts.map((mc) => (
                    <div key={mc._id || mc.description} className="text-[12px] text-gray-700 flex items-center justify-between">
                      <span>{mc.description}</span>
                      <span className="font-medium">₹{mc.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trainers list */}
            {p.trainers && p.trainers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Trainers</p>
                <div className="flex flex-wrap gap-2">
                  {p.trainers.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-[12px]">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">{t.name[0]}</span>
                      <span className="text-gray-700 font-medium">{t.name}</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${assignmentStatusColors[t.status || "assigned"] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{t.status || "assigned"}</span>
                      <span className="text-gray-400">₹{t.cost.toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
