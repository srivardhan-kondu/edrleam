import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building, ArrowRight } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface College {
  collegeName: string; projectCount: number; totalRevenue: number;
  totalTrainerCost: number; totalMiscCost: number; profit: number;
  activeProjects: number; completedProjects: number;
}

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/colleges", { headers: authHeaders() })
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

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Colleges</h1>
          <p className="text-sm text-gray-500 mt-1">{colleges.length} colleges with projects</p>
        </div>
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : colleges.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Building size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No colleges yet</p>
          <p className="text-[13px] text-gray-400 mt-1">Create projects with college names to see them here.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((c) => (
            <Link key={c.collegeName} to={`/admin/colleges/${encodeURIComponent(c.collegeName)}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-bold text-indigo-700">{c.collegeName[0]}</div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors mt-1" />
              </div>
              <h3 className="font-semibold text-gray-900 text-[15px] mb-1">{c.collegeName}</h3>
              <p className="text-[12px] text-gray-500 mb-3">{c.projectCount} projects · {c.activeProjects} active</p>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Revenue</p>
                  <p className="text-[14px] font-bold text-gray-900">₹{(c.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Profit</p>
                  <p className={`text-[14px] font-bold ${(c.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{(c.profit || 0).toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
