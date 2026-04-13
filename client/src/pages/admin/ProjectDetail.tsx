import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, X, UserPlus, Calendar, DollarSign, Users, Mail, Phone, User, FileText, Download } from "lucide-react";
import { authHeaders, authToken } from "../../lib/api";

interface Project {
  _id: string; name: string; collegeName: string; description: string; dealAmount: number;
  startDate: string; endDate: string; status: string; skillsRequired: string[];
  contactPerson: string; contactEmail: string; contactPhone: string;
  miscCosts: { description: string; amount: number }[];
}
interface Assignment { _id: string; projectId: string; trainerId: { _id: string; name: string; email: string; ratePerDay: number }; noOfDays?: number; perDayCost?: number; trainerCost: number; status: string; notes: string; }
interface Trainer { _id: string; name: string; email: string; ratePerDay: number; skills: string[]; status: string; }

const statusColors: Record<string, string> = {
  "completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  "upcoming": "bg-amber-50 text-amber-700 border-amber-200",
  "cancelled": "bg-gray-100 text-gray-500 border-gray-200",
};
const aStatusColors: Record<string, string> = {
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ trainerId: "", noOfDays: "", perDayCost: "", trainerCost: "", notes: "" });
  const [tocFile, setTocFile] = useState<File | null>(null);
  const [tocDescription, setTocDescription] = useState("");

  const fetchData = async () => {
    try {
      const [projectRes, assignmentsRes, trainersRes] = await Promise.all([
        fetch(`/api/projects/${id}`, { headers: authHeaders() }),
        fetch(`/api/assignments?projectId=${id}`, { headers: authHeaders() }),
        fetch("/api/trainers", { headers: authHeaders() }),
      ]);

      const [projectData, assignmentsData, trainersData] = await Promise.all([
        projectRes.json(),
        assignmentsRes.json(),
        trainersRes.json(),
      ]);

      if (!projectRes.ok) throw new Error(projectData.error || "Failed to load project");
      if (!assignmentsRes.ok) throw new Error(assignmentsData.error || "Failed to load assignments");
      if (!trainersRes.ok) throw new Error(trainersData.error || "Failed to load trainers");

      setProject(projectData.project || null);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : projectData.assignments || []);
      setTrainers((Array.isArray(trainersData) ? trainersData : []).filter((tr: Trainer) => tr.status === "approved"));
      setError("");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project details");
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, [id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = Number(assignForm.noOfDays) || 0;
    const perDay = Number(assignForm.perDayCost) || 0;
    const totalCost = days * perDay;

    const formData = new FormData();
    formData.append("projectId", id || "");
    formData.append("trainerId", assignForm.trainerId);
    formData.append("noOfDays", String(days));
    formData.append("perDayCost", String(perDay));
    formData.append("trainerCost", String(totalCost));
    formData.append("notes", assignForm.notes);
    if (tocFile) {
      formData.append("toc", tocFile);
      formData.append("tocDescription", tocDescription);
    }

    await fetch("/api/assignments", {
      method: "POST",
      headers: authToken(),
      body: formData,
    });

    setShowAssignModal(false);
    setAssignForm({ trainerId: "", noOfDays: "", perDayCost: "", trainerCost: "", notes: "" });
    setTocFile(null);
    setTocDescription("");
    fetchData();
  };

  const handleDeleteAssignment = async (aid: string) => {
    if (!confirm("Remove this trainer assignment?")) return;
    await fetch(`/api/assignments/${aid}`, { method: "DELETE", headers: authHeaders() }); fetchData();
  };

  const handleDeleteProject = async () => {
    if (!confirm("Delete this project and all assignments?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE", headers: authHeaders() }); navigate("/admin/projects");
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (error || !project) return <div className="bg-white border border-red-200 rounded-xl p-16 text-center"><p className="text-sm text-red-700 font-medium">{error || "Project not found"}</p></div>;

  const trainerCostTotal = assignments.reduce((s, a) => s + a.trainerCost, 0);
  const miscCostTotal = (project.miscCosts || []).reduce((s, mc) => s + mc.amount, 0);
  const totalCost = trainerCostTotal + miscCostTotal;
  const profit = project.dealAmount - totalCost;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/projects" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0 pl-6 sm:pl-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">{project.name}</h1>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[project.status] || statusColors.cancelled}`}>{project.status}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{project.collegeName}</p>
        </div>
        <button onClick={handleDeleteProject} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Deal</span></div>
          <p className="text-lg font-bold text-gray-900">₹{project.dealAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Users size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Trainers</span></div>
          <p className="text-lg font-bold text-gray-900">{assignments.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Total Cost</span></div>
          <p className="text-lg font-bold text-gray-900">₹{totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Profit</span></div>
          <p className={`text-lg font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{profit.toLocaleString()}</p>
        </div>
      </div>

      {/* Details + Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">Details</h2>
          {project.description && <p className="text-[13px] text-gray-600 mb-3">{project.description}</p>}
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-2 text-gray-500"><Calendar size={13} /> {new Date(project.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} — {new Date(project.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
          {project.skillsRequired.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{project.skillsRequired.map((s) => (<span key={s} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[11px] font-medium">{s}</span>))}</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">Contact</h2>
          <div className="space-y-2 text-[13px] text-gray-600">
            {project.contactPerson && <div className="flex items-center gap-2"><User size={13} className="text-gray-400" />{project.contactPerson}</div>}
            {project.contactEmail && <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400" />{project.contactEmail}</div>}
            {project.contactPhone && <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400" />{project.contactPhone}</div>}
          </div>
          {project.miscCosts && project.miscCosts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Misc Costs</h3>
              <div className="space-y-1">{project.miscCosts.map((mc, i) => (<div key={i} className="flex justify-between text-[13px]"><span className="text-gray-600">{mc.description}</span><span className="font-medium text-gray-900">₹{mc.amount.toLocaleString()}</span></div>))}</div>
            </div>
          )}
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-gray-900">Assigned Trainers</h2>
          <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"><UserPlus size={14} /> Assign</button>
        </div>
        {assignments.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-8">No trainers assigned yet</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a._id}>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[12px] font-bold text-indigo-700">{a.trainerId?.name?.[0] || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{a.trainerId?.name || "Unknown"}</p>
                    <p className="text-[12px] text-gray-500">{a.trainerId?.email}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.noOfDays || 0} day(s) x ₹{(a.perDayCost || 0).toLocaleString()}/day</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${aStatusColors[a.status] || aStatusColors.assigned}`}>{a.status}</span>
                  <span className="text-[13px] font-semibold text-gray-900">₹{a.trainerCost.toLocaleString()}</span>
                  <button onClick={() => handleDeleteAssignment(a._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                </div>
                {/* TOC Display */}
                {(a as any).toc && (a as any).toc.filepath && (
                  <div className="ml-11 mr-3 mt-1 mb-1 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-blue-900 truncate">{(a as any).toc.filename}</p>
                      {(a as any).toc.description && <p className="text-[11px] text-blue-700 truncate">{(a as any).toc.description}</p>}
                    </div>
                    <a
                      href={`http://localhost:5001${(a as any).toc.filepath}`}
                      download={(a as any).toc.filename}
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
            ))}
          </div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl border border-gray-200 shadow-xl w-full sm:max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Assign Trainer</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Trainer</label>
                <select
                  value={assignForm.trainerId}
                  onChange={(e) => {
                    const trainerId = e.target.value;
                    const selectedTrainer = trainers.find((t) => t._id === trainerId);
                    const perDayCost = selectedTrainer?.ratePerDay ? String(selectedTrainer.ratePerDay) : "";
                    const noOfDays = assignForm.noOfDays;
                    const trainerCost = noOfDays && perDayCost ? String(Number(noOfDays) * Number(perDayCost)) : "";
                    setAssignForm({ ...assignForm, trainerId, perDayCost, trainerCost });
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select trainer</option>
                  {trainers.map((t) => (<option key={t._id} value={t._id}>{t.name} — ₹{t.ratePerDay}/day</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">No. of Days</label>
                <input
                  type="number"
                  value={assignForm.noOfDays}
                  onChange={(e) => {
                    const noOfDays = e.target.value;
                    const perDayCost = assignForm.perDayCost;
                    const trainerCost = noOfDays && perDayCost ? String(Number(noOfDays) * Number(perDayCost)) : "";
                    setAssignForm({ ...assignForm, noOfDays, trainerCost });
                  }}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Per Day Cost (₹)</label>
                <input
                  type="number"
                  value={assignForm.perDayCost}
                  onChange={(e) => {
                    const perDayCost = e.target.value;
                    const noOfDays = assignForm.noOfDays;
                    const trainerCost = noOfDays && perDayCost ? String(Number(noOfDays) * Number(perDayCost)) : "";
                    setAssignForm({ ...assignForm, perDayCost, trainerCost });
                  }}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Total Trainer Cost (₹)</label>
                <input type="number" value={assignForm.trainerCost} readOnly className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-[14px] text-gray-800" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
              </div>

              {/* TOC Upload */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Table of Contents (TOC)</label>
                <p className="text-[11px] text-gray-500 mb-2">Attach TOC file (PDF/DOCX, max 10MB). Auto-deleted on project completion.</p>
                {!tocFile ? (
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setTocFile(file);
                      }}
                      className="hidden"
                    />
                    <div className="text-center">
                      <FileText size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-[13px] text-gray-600 font-medium">Click to upload TOC</p>
                      <p className="text-[11px] text-gray-400">PDF or DOCX</p>
                    </div>
                  </label>
                ) : (
                  <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-indigo-600 shrink-0" />
                      <span className="text-[13px] text-indigo-900 truncate font-medium">{tocFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setTocFile(null)} className="p-1 text-indigo-400 hover:text-indigo-600 shrink-0"><X size={16} /></button>
                  </div>
                )}
                {tocFile && (
                  <input
                    type="text"
                    value={tocDescription}
                    onChange={(e) => setTocDescription(e.target.value)}
                    placeholder="TOC description (optional)"
                    className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 shadow-sm">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
