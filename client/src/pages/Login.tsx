import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    navigate(result.role === "admin" ? "/admin" : "/trainer");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <GraduationCap size={22} />
          </div>
          <span className="text-[20px] font-bold tracking-tight text-gray-900">Edleam</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 text-center">Welcome back</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 text-center">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {error && (
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">{error}</div>
            )}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-[14px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm mt-2">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-[13px] text-gray-500 mt-5">
            Trainer?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700">Register here</Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">Edleam · Training Management Platform</p>
      </div>
    </div>
  );
}
