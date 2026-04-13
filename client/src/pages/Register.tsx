import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Check, X, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "", skills: "", experience: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
    match: form.password.length > 0 && form.password === form.confirmPassword,
  };

  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!allValid) {
      setError("Please meet all password requirements");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience: form.experience,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setSuccess(data.message); setLoading(false);
  };

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald-600" : "text-gray-400"}`}>
      {ok ? <Check size={12} /> : <X size={12} />}
      {label}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <GraduationCap size={22} />
          </div>
          <span className="text-[20px] font-bold tracking-tight text-gray-900">Edleam</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 text-center">Trainer Registration</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 text-center">Create your account to receive assignments</p>

          {success ? (
            <div className="mt-7 text-center">
              <div className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 font-medium">{success}</div>
              <Link to="/login" className="text-[14px] text-indigo-600 font-semibold hover:text-indigo-700">Go to Login →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
              {error && (
                <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">{error}</div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Create Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8}
                    className={`${inputClass} pr-10`} placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required minLength={8}
                    className={`${inputClass} pr-10`} placeholder="Re-enter password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {form.password.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5 grid grid-cols-2 gap-1">
                  <CheckItem ok={checks.length} label="Min 8 chars" />
                  <CheckItem ok={checks.uppercase} label="Uppercase" />
                  <CheckItem ok={checks.lowercase} label="Lowercase" />
                  <CheckItem ok={checks.number} label="Number" />
                  <CheckItem ok={checks.special} label="Special char" />
                  <CheckItem ok={checks.match} label="Passwords match" />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Skills <span className="text-gray-400">(comma separated)</span></label>
                <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, Java, React" className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Experience</label>
                <input type="text" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="3 years in corporate training" className={inputClass} />
              </div>
              <button type="submit" disabled={loading || !allValid}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-[14px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm mt-1">
                {loading ? "Registering..." : "Register"}
              </button>
            </form>
          )}

          <p className="text-center text-[13px] text-gray-500 mt-5">
            Already registered?{" "}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">Edleam · Training Management Platform</p>
      </div>
    </div>
  );
}
