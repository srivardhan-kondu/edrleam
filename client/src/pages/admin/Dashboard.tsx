import { useEffect, useState } from "react";
import {
  IndianRupee,
  TrendingUp,
  FolderKanban,
  Building2,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { authHeaders } from "../../lib/api";

interface DashboardData {
  totalRevenue: number;
  totalTrainerCost: number;
  totalMiscCost: number;
  totalCost: number;
  totalProfit: number;
  activeProjects: number;
  upcomingProjects: number;
  completedProjects: number;
  totalProjects: number;
  totalColleges: number;
  chartData: { month: string; revenue: number; cost: number; profit: number }[];
  collegeSummary: any[];
  period: string;
}

function formatCurrency(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString()}`;
}

const periodLabels: Record<string, string> = {
  week: "This Week", month: "This Month", year: "This Year", all: "All Time",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");

  const fetchData = (p: string) => {
    setLoading(true);
    fetch(`/api/dashboard?period=${p}`, { headers: authHeaders() })
      .then(async (res) => {
        const response = await res.json();
        if (!res.ok) throw new Error(response.error || "Failed to load dashboard");
        return response;
      })
      .then((d) => {
        setData(d);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard");
        setData(null);
        setLoading(false);
      });
  };

  useEffect(() => { fetchData(period); }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="bg-white border border-red-200 rounded-xl p-16 text-center"><p className="text-sm text-red-700 font-medium">{error || "Failed to load dashboard"}</p></div>;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: IndianRupee, accent: "bg-emerald-50 text-emerald-600" },
    { label: "Total Expenses", value: formatCurrency(data.totalCost), icon: ArrowDownRight, accent: "bg-red-50 text-red-500" },
    { label: "Net Profit", value: formatCurrency(data.totalProfit), icon: TrendingUp, accent: "bg-indigo-50 text-indigo-600" },
    { label: "Projects", value: data.totalProjects, icon: FolderKanban, accent: "bg-amber-50 text-amber-600" },
    { label: "Colleges", value: data.totalColleges, icon: Building2, accent: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{periodLabels[period]} overview</p>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
          {(["week", "month", "year", "all"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                period === p ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-gray-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.accent}`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {data.chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-5">Monthly Overview</h2>
          <div className="h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]}
                  contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} iconType="circle" iconSize={8} />
                <Bar dataKey="revenue" fill="#111827" name="Revenue" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cost" fill="#ef4444" name="Expenses" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#059669" name="Profit" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">College Summary</h2>
        </div>
        {data.collegeSummary.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 sm:px-6 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">College</th>
                  <th className="text-center px-5 sm:px-6 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">Projects</th>
                  <th className="text-right px-5 sm:px-6 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-5 sm:px-6 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">Cost</th>
                  <th className="text-right px-5 sm:px-6 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.collegeSummary.map((c: any) => (
                  <tr key={c.collegeName} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 sm:px-6 py-3.5"><Link to={`/admin/colleges/${encodeURIComponent(c.collegeName)}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">{c.collegeName}</Link></td>
                    <td className="px-5 sm:px-6 py-3.5 text-center text-gray-600">{c.projects}</td>
                    <td className="px-5 sm:px-6 py-3.5 text-right text-gray-900 font-medium">₹{c.revenue.toLocaleString()}</td>
                    <td className="px-5 sm:px-6 py-3.5 text-right text-red-600">₹{c.cost.toLocaleString()}</td>
                    <td className={`px-5 sm:px-6 py-3.5 text-right font-semibold ${c.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{c.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upcoming", value: data.upcomingProjects, color: "text-amber-600" },
          { label: "In Progress", value: data.activeProjects, color: "text-indigo-600" },
          { label: "Completed", value: data.completedProjects, color: "text-emerald-600" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow">
            <p className={`text-2xl sm:text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[13px] text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
