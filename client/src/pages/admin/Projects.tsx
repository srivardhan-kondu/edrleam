import { useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2, Eye, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { authHeaders } from "../../lib/api";

interface Project {
  _id: string; name: string; collegeName: string; description: string; dealAmount: number;
  startDate: string; endDate: string; status: string; skillsRequired: string[];
  contactPerson: string; contactEmail: string; contactPhone: string;
  miscCosts: { description: string; amount: number }[];
}

const emptyForm = {
  name: "", collegeName: "", description: "", dealAmount: "", startDate: "", endDate: "",
  status: "upcoming", skillsRequired: "", contactPerson: "", contactEmail: "", contactPhone: "",
  miscCosts: [] as { description: string; amount: string }[],
};

const statusColors: Record<string, string> = {
  "completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  "upcoming": "bg-amber-50 text-amber-700 border-amber-200",
  "cancelled": "bg-gray-100 text-gray-500 border-gray-200",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const collegeOptions = Array.from(
    new Set(projects.map((p) => (p.collegeName || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const fetchProjects = () => {
    fetch("/api/projects", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load projects");
        return data;
      })
      .then((d) => {
        setProjects(Array.isArray(d) ? d : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load projects");
        setProjects([]);
        setLoading(false);
      });
  };

  useEffect(() => { fetchProjects(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };

  const openEdit = (p: Project) => {
    setForm({
      name: p.name, collegeName: p.collegeName, description: p.description,
      dealAmount: p.dealAmount.toString(), startDate: p.startDate.split("T")[0],
      endDate: p.endDate.split("T")[0], status: p.status,
      skillsRequired: p.skillsRequired.join(", "), contactPerson: p.contactPerson,
      contactEmail: p.contactEmail, contactPhone: p.contactPhone,
      miscCosts: (p.miscCosts || []).map((mc) => ({ description: mc.description, amount: mc.amount.toString() })),
    });
    setEditing(p._id); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form, dealAmount: Number(form.dealAmount),
      skillsRequired: form.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean),
      miscCosts: form.miscCosts.filter((mc) => mc.description && mc.amount).map((mc) => ({ description: mc.description, amount: Number(mc.amount) })),
    };
    if (editing) {
      await fetch(`/api/projects/${editing}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
    } else {
      await fetch("/api/projects", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
    }
    setShowModal(false); fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its assignments?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE", headers: authHeaders() }); fetchProjects();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={15} /><span className="hidden sm:inline">New Project</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><FolderKanban size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No projects yet</p>
          <p className="text-[13px] text-gray-400 mt-1">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{p.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[p.status] || statusColors.cancelled}`}>{p.status}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 mt-0.5">{p.collegeName}</p>
                  {p.description && <p className="text-[13px] text-gray-400 mt-1.5 line-clamp-1">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-[12px] text-gray-500 flex-wrap">
                    <span className="font-semibold text-gray-900 text-[13px]">₹{p.dealAmount.toLocaleString()}</span>
                    <span className="w-px h-3 bg-gray-200" />
                    <span>{new Date(p.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {p.skillsRequired.length > 0 && (
                      <><span className="w-px h-3 bg-gray-200" />
                      <div className="flex gap-1 flex-wrap">
                        {p.skillsRequired.slice(0, 3).map((s) => (<span key={s} className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-600">{s}</span>))}
                        {p.skillsRequired.length > 3 && <span className="text-gray-400 text-[11px]">+{p.skillsRequired.length - 3}</span>}
                      </div></>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 self-end sm:self-center">
                  <Link to={`/admin/projects/${p._id}`} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"><Eye size={15} /></Link>
                  <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl border border-gray-200 shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl z-10">
              <h2 className="text-[15px] font-semibold text-gray-900">{editing ? "Edit Project" : "New Project"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Project Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div className="sm:col-span-2"><label className="block text-[13px] font-medium text-gray-700 mb-1.5">College Name</label>
                  <input type="text" list="college-name-options" value={form.collegeName} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} required placeholder="Select existing or type new college" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" />
                  <datalist id="college-name-options">
                    {collegeOptions.map((college) => (
                      <option key={college} value={college} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2"><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none" /></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Deal Amount (₹)</label>
                  <input type="number" value={form.dealAmount} onChange={(e) => setForm({ ...form, dealAmount: e.target.value })} required min="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors">
                    <option value="upcoming">Upcoming</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div className="sm:col-span-2"><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Skills Required <span className="text-gray-400">(comma separated)</span></label>
                  <input type="text" value={form.skillsRequired} onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })} placeholder="Python, React, Java" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div className="sm:col-span-2">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Miscellaneous Costs</label>
                  {form.miscCosts.map((mc, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input type="text" value={mc.description} onChange={(e) => { const u = [...form.miscCosts]; u[i] = { ...u[i], description: e.target.value }; setForm({ ...form, miscCosts: u }); }} placeholder="Description" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <input type="number" value={mc.amount} onChange={(e) => { const u = [...form.miscCosts]; u[i] = { ...u[i], amount: e.target.value }; setForm({ ...form, miscCosts: u }); }} placeholder="₹ Amount" min="0" className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <button type="button" onClick={() => setForm({ ...form, miscCosts: form.miscCosts.filter((_, idx) => idx !== i) })} className="p-1.5 text-gray-400 hover:text-red-500"><X size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({ ...form, miscCosts: [...form.miscCosts, { description: "", amount: "" }] })} className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><Plus size={12} /> Add Cost Item</button>
                </div>
                <div className="sm:col-span-2"><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Contact Person</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Contact Email</label>
                  <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
                <div><label className="block text-[13px] font-medium text-gray-700 mb-1.5">Contact Phone</label>
                  <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm">{editing ? "Update" : "Create"} Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
