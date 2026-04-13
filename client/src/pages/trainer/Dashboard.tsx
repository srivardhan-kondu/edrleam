import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authHeaders } from "../../lib/api";
import { ClipboardList, CheckCircle, Clock, Building2, XCircle } from "lucide-react";

interface Assignment {
  _id: string;
  projectId: { _id: string; name: string; collegeName: string; startDate: string; endDate: string };
  trainerCost: number; status: string; notes: string; createdAt: string;
}

interface CollegeOverview {
  collegeName: string;
  projectCount: number;
  assignmentCount: number;
  totalEarnings: number;
  activeAssignments: number;
}

const statusColors: Record<string, string> = {
  assigned: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [colleges, setColleges] = useState<CollegeOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/assignments", { headers: authHeaders() }),
      fetch("/api/colleges/trainer/overview", { headers: authHeaders() }),
    ])
      .then(async ([assignmentsRes, collegesRes]) => {
        const assignmentsData = await assignmentsRes.json();
        const collegesData = await collegesRes.json();
        if (!assignmentsRes.ok) throw new Error(assignmentsData.error || "Failed to load assignments");
        if (!collegesRes.ok) throw new Error(collegesData.error || "Failed to load colleges");

        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        setColleges(Array.isArray(collegesData) ? collegesData : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard");
        setAssignments([]);
        setColleges([]);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/assignments/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });

    Promise.all([
      fetch("/api/assignments", { headers: authHeaders() }),
      fetch("/api/colleges/trainer/overview", { headers: authHeaders() }),
    ])
      .then(async ([assignmentsRes, collegesRes]) => {
        const assignmentsData = await assignmentsRes.json();
        const collegesData = await collegesRes.json();
        if (!assignmentsRes.ok) throw new Error(assignmentsData.error || "Failed to load assignments");
        if (!collegesRes.ok) throw new Error(collegesData.error || "Failed to load colleges");
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        setColleges(Array.isArray(collegesData) ? collegesData : []);
      })
      .catch(() => {});
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (error) return <div className="bg-white border border-red-200 rounded-xl p-16 text-center"><p className="text-sm text-red-700 font-medium">{error}</p></div>;

  const stats = {
    total: assignments.length,
    active: assignments.filter((a) => a.status === "accepted").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    pending: assignments.filter((a) => ["assigned", "pending"].includes(a.status)).length,
    totalEarnings: colleges.reduce((sum, college) => sum + Number(college.totalEarnings || 0), 0),
  };

  const quickActions = assignments.filter((a) => ["assigned", "pending", "accepted"].includes(a.status)).slice(0, 4);

  const collegeSummary = colleges;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pl-10 sm:pl-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s your work summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><ClipboardList size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Total</span></div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-blue-500 mb-2"><Clock size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Active</span></div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.active}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-emerald-500 mb-2"><CheckCircle size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span></div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completed}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><span className="text-[11px] font-semibold uppercase tracking-wider">Cleared Earnings</span></div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">₹{stats.totalEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Assignments */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[14px] font-semibold text-gray-900">Quick Actions</h2>
        </div>
        {quickActions.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-400">No pending actions</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {quickActions.map((a) => (
              <div key={a._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{a.projectId?.name}</p>
                  <Link to={`/trainer/colleges/${encodeURIComponent(a.projectId?.collegeName || "")}`} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium">{a.projectId?.collegeName}</Link>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors[a.status]}`}>{a.status}</span>
                  <span className="text-[13px] font-semibold text-gray-900">₹{a.trainerCost.toLocaleString()}</span>
                  {(a.status === "assigned" || a.status === "pending") && (
                    <>
                      <button onClick={() => updateStatus(a._id, "accepted")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Accept</button>
                      <button onClick={() => updateStatus(a._id, "rejected")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Reject</button>
                    </>
                  )}
                  {a.status === "accepted" && (
                    <button onClick={() => updateStatus(a._id, "completed")} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* College-Centric Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl mt-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-gray-900">Colleges</h2>
          <Link to="/trainer/colleges" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        {collegeSummary.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-gray-400">No colleges mapped yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {collegeSummary.slice(0, 5).map((c) => (
              <Link key={c.collegeName} to={`/trainer/colleges/${encodeURIComponent(c.collegeName)}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold"><Building2 size={14} /></div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{c.collegeName}</p>
                    <p className="text-[11px] text-gray-500">{c.assignmentCount} assignments • {c.activeAssignments} active</p>
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-gray-900">₹{c.totalEarnings.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
