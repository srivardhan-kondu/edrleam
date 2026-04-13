import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { authHeaders } from "../../lib/api";

interface DashboardData {
  totalRevenue: number;
  totalTrainerCost: number;
  totalMiscCost: number;
  totalProfit: number;
  totalProjects: number;
  chartData: { month: string; revenue: number; cost: number; profit: number }[];
  collegeSummary: { collegeName: string; revenue: number; cost: number; profit: number; projects: number }[];
}

export default function FinancialsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    fetch(`/api/dashboard?period=${period}`, { headers: authHeaders() })
      .then(async (r) => {
        const response = await r.json();
        if (!r.ok) throw new Error(response.error || "Failed to load financials");
        return response;
      })
      .then((d) => {
        setData(d);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load financials");
        setData(null);
        setLoading(false);
      });
  }, [period]);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="bg-white border border-red-200 rounded-xl p-16 text-center"><p className="text-sm text-red-700 font-medium">{error || "Failed to load financials"}</p></div>;

  const kpis = {
    totalRevenue: data.totalRevenue || 0,
    totalTrainerCosts: data.totalTrainerCost || 0,
    totalMiscCosts: data.totalMiscCost || 0,
    totalProfit: data.totalProfit || 0,
    totalProjects: data.totalProjects || 0,
    avgProfitMargin: data.totalRevenue ? (data.totalProfit / data.totalRevenue) * 100 : 0,
  };
  const chartData = (data.collegeSummary || []).map((item) => ({
    collegeName: item.collegeName,
    revenue: item.revenue,
    cost: item.cost,
    profit: item.profit,
  }));
  const collegeSummary = (data.collegeSummary || []).map((item) => ({
    collegeName: item.collegeName,
    projectCount: item.projects,
    totalRevenue: item.revenue,
    totalCost: item.cost,
    profit: item.profit,
    margin: item.revenue ? (item.profit / item.revenue) * 100 : 0,
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Financials</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, costs & profit analysis</p>
        </div>
        <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1">
          {[
            { key: "week", label: "Week" }, { key: "month", label: "Month" },
            { key: "year", label: "Year" }, { key: "all", label: "All" },
          ].map((p) => (
            <button key={p.key} onClick={() => { setLoading(true); setPeriod(p.key); }} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${period === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><DollarSign size={14} /><span className="text-[11px] font-semibold uppercase tracking-wider">Revenue</span></div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{kpis.totalRevenue.toLocaleString()}</p>
          <p className="text-[12px] text-gray-400 mt-1">{kpis.totalProjects} projects</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><ArrowDownRight size={14} className="text-red-400" /><span className="text-[11px] font-semibold uppercase tracking-wider">Costs</span></div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{(kpis.totalTrainerCosts + kpis.totalMiscCosts).toLocaleString()}</p>
          <div className="text-[12px] text-gray-400 mt-1 space-y-0.5">
            <p>Trainers: ₹{kpis.totalTrainerCosts.toLocaleString()}</p>
            <p>Misc: ₹{kpis.totalMiscCosts.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            {kpis.totalProfit >= 0 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
            <span className="text-[11px] font-semibold uppercase tracking-wider">Profit</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${kpis.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{kpis.totalProfit.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            {kpis.avgProfitMargin >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
            <span className="text-[11px] font-semibold uppercase tracking-wider">Margin</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${kpis.avgProfitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{kpis.avgProfitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-4">College-wise Breakdown</h2>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="collegeName" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="revenue" name="Revenue" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* College Summary Table */}
      {collegeSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[14px] font-semibold text-gray-900">College Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">College</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody>
                {collegeSummary.map((c) => (
                  <tr key={c.collegeName} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{c.collegeName}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{c.projectCount}</td>
                    <td className="px-5 py-3 text-right text-gray-600">₹{c.totalRevenue.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-600">₹{c.totalCost.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right font-medium ${c.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{c.profit.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right font-medium ${c.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{c.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
