import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authHeaders } from "../../lib/api";
import { ClipboardList, CheckCircle, XCircle } from "lucide-react";

interface Assignment {
  _id: string;
  projectId: { _id: string; name: string; collegeName: string; startDate: string; endDate: string; description: string; skillsRequired: string[] };
  trainerCost: number; status: string; notes: string; createdAt: string;
}

const statusColors: Record<string, string> = {
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function TrainerAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("action");

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

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/assignments/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status }) });
    fetchAssignments();
  };

  const filtered =
    filter === "all"
      ? assignments
      : filter === "action"
      ? assignments.filter((a) => ["assigned", "pending", "accepted"].includes(a.status))
      : assignments.filter((a) => a.status === filter);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">My Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">{assignments.length} total assignments</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100/80 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: "action", label: "Action Required" },
          { key: "all", label: "All" },
          { key: "completed", label: "Completed" },
          { key: "rejected", label: "Rejected" },
        ].map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${filter === s.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{s.label}</button>
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
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{a.projectId?.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[a.status]}`}>{a.status}</span>
                  </div>
                  <Link to={`/trainer/colleges/${encodeURIComponent(a.projectId?.collegeName || "")}`} className="text-[13px] text-indigo-600 hover:text-indigo-700 mt-0.5 inline-block font-medium">{a.projectId?.collegeName}</Link>
                  {a.projectId?.description && <p className="text-[13px] text-gray-400 mt-1.5 line-clamp-2">{a.projectId.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[12px] text-gray-500 flex-wrap">
                    <span className="font-semibold text-gray-900 text-[13px]">₹{a.trainerCost.toLocaleString()}</span>
                    {a.projectId?.startDate && (
                      <><span className="w-px h-3 bg-gray-200" />
                      <span>{new Date(a.projectId.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — {new Date(a.projectId.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span></>
                    )}
                  </div>
                  {a.projectId?.skillsRequired && a.projectId.skillsRequired.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {a.projectId.skillsRequired.map((s) => (<span key={s} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] font-medium">{s}</span>))}
                    </div>
                  )}
                  {a.notes && <p className="text-[12px] text-gray-400 mt-2 italic">Note: {a.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {(a.status === "assigned" || a.status === "pending") && (
                    <>
                      <button onClick={() => updateStatus(a._id, "accepted")} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[12px] font-semibold hover:bg-emerald-100 border border-emerald-200 transition-colors"><CheckCircle size={13} /> Accept</button>
                      <button onClick={() => updateStatus(a._id, "rejected")} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-semibold hover:bg-red-100 border border-red-200 transition-colors"><XCircle size={13} /> Reject</button>
                    </>
                  )}
                  {a.status === "accepted" && (
                    <button onClick={() => updateStatus(a._id, "completed")} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[12px] font-semibold hover:bg-indigo-100 border border-indigo-200 transition-colors"><CheckCircle size={13} /> Complete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
