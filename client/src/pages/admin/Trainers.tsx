import { useEffect, useState } from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface Trainer {
  _id: string; name: string; email: string; phone: string; skills: string[];
  experience: string; ratePerDay: number; status: string; role: string; createdAt: string;
}

const statusColors: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};
const statusIcons: Record<string, typeof CheckCircle> = { approved: CheckCircle, pending: Clock, rejected: XCircle };

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchTrainers = () => {
    fetch("/api/trainers", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load trainers");
        return data;
      })
      .then((d) => {
        setTrainers(Array.isArray(d) ? d : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load trainers");
        setTrainers([]);
        setLoading(false);
      });
  };

  useEffect(() => { fetchTrainers(); }, []);

  const updateTrainer = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/trainers/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(data) }); fetchTrainers();
  };

  const deleteTrainer = async (id: string) => {
    if (!confirm("Delete this trainer?")) return;
    await fetch(`/api/trainers/${id}`, { method: "DELETE", headers: authHeaders() }); fetchTrainers();
  };

  const filtered = filter === "all" ? trainers : trainers.filter((t) => t.status === filter);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Trainers</h1>
          <p className="text-sm text-gray-500 mt-1">{trainers.length} total trainers</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100/80 rounded-lg p-1 w-fit">
        {["all", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-colors ${filter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{s} {s !== "all" && `(${trainers.filter((t) => t.status === s).length})`}{s === "all" && `(${trainers.length})`}</button>
        ))}
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Users size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No trainers found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => {
            const Icon = statusIcons[t.status] || Clock;
            return (
              <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-bold text-indigo-700 shrink-0">{t.name[0]}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-[15px]">{t.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[t.status]}`}><Icon size={10} />{t.status}</span>
                      </div>
                      <p className="text-[13px] text-gray-500">{t.email}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[12px] text-gray-500 flex-wrap">
                        {t.phone && <span>{t.phone}</span>}
                        <span className="font-semibold text-gray-900">₹{t.ratePerDay?.toLocaleString() || 0}/day</span>
                        {t.experience && <><span className="w-px h-3 bg-gray-200" /><span>{t.experience}</span></>}
                      </div>
                      {t.skills && t.skills.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {t.skills.map((s) => (<span key={s} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] font-medium">{s}</span>))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    {t.status === "pending" && (
                      <>
                        <button onClick={() => updateTrainer(t._id, { status: "approved" })} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve"><CheckCircle size={16} /></button>
                        <button onClick={() => updateTrainer(t._id, { status: "rejected" })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><XCircle size={16} /></button>
                      </>
                    )}
                    {t.status === "rejected" && (
                      <button onClick={() => updateTrainer(t._id, { status: "approved" })} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve"><CheckCircle size={16} /></button>
                    )}
                    <button onClick={() => deleteTrainer(t._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
