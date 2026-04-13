import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ClipboardList, Eye } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface Assignment {
  _id: string;
  projectId: { _id: string; name: string; collegeName: string };
  trainerId: { _id: string; name: string; email: string };
  trainerCost: number; status: string; notes: string; createdAt: string;
}

const statusColors: Record<string, string> = {
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchAssignments = () => {
    fetch("/api/assignments", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load assignments");
        return data;
      })
      .then((d) => {
        setAssignments(Array.isArray(d) ? d : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load assignments");
        setAssignments([]);
        setLoading(false);
      });
  };
  useEffect(() => { fetchAssignments(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    await fetch(`/api/assignments/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAssignments();
  };

  const filtered = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">{assignments.length} total assignments</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100/80 rounded-lg p-1 w-fit flex-wrap">
        {["all", "assigned", "accepted", "completed", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-colors ${filter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{s}</button>
        ))}
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><ClipboardList size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No assignments found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <div key={a._id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-[13px] font-bold text-indigo-700 shrink-0">{a.trainerId?.name?.[0] || "?"}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-[14px]">{a.trainerId?.name || "Unknown"}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[a.status]}`}>{a.status}</span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-0.5">{a.projectId?.name} — {a.projectId?.collegeName}</p>
                    {a.notes && <p className="text-[12px] text-gray-400 mt-1 line-clamp-1">{a.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[14px] font-semibold text-gray-900">₹{a.trainerCost.toLocaleString()}</span>
                  <Link to={`/admin/projects/${a.projectId?._id}`} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"><Eye size={15} /></Link>
                  <button onClick={() => handleDelete(a._id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
