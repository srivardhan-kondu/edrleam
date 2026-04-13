import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowRight, FolderKanban, ClipboardList } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface CollegeOverview {
  collegeName: string;
  projectCount: number;
  assignmentCount: number;
  totalEarnings: number;
  activeAssignments: number;
  completedAssignments: number;
  lastAssignmentAt: string;
  projects: {
    projectId: string;
    projectName: string;
    cycleLabel: string;
    status: string;
  }[];
}

export default function TrainerCollegesPage() {
  const [colleges, setColleges] = useState<CollegeOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/colleges/trainer/overview", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load colleges");
        return data;
      })
      .then((d) => {
        setColleges(Array.isArray(d) ? d : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load colleges");
        setColleges([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 pl-10 sm:pl-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">My Colleges</h1>
        <p className="text-sm text-gray-500 mt-1">College-centric view of all your assignments and project cycles</p>
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : colleges.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Building2 size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No college assignments yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {colleges.map((c) => (
            <Link
              key={c.collegeName}
              to={`/trainer/colleges/${encodeURIComponent(c.collegeName)}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-bold text-indigo-700">{c.collegeName[0]}</div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors mt-1" />
              </div>

              <h3 className="font-semibold text-gray-900 text-[15px] mb-1">{c.collegeName}</h3>
              <p className="text-[12px] text-gray-500 mb-3">{c.projectCount} project cycles • {c.assignmentCount} assignments</p>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400">Cleared Earnings</div>
                  <div className="font-semibold text-gray-900">₹{c.totalEarnings.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400">Active</div>
                  <div className="font-semibold text-gray-900">{c.activeAssignments}</div>
                </div>
              </div>

              {c.projects.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Recent Cycles</p>
                  <div className="space-y-1">
                    {c.projects.slice(0, 3).map((p) => (
                      <div key={p.projectId} className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-600 truncate mr-2">{p.projectName}</span>
                        <span className="text-gray-400">{p.cycleLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
