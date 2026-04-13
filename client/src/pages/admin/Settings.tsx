import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authHeaders } from "../../lib/api";
import { Shield, Eye, EyeOff, Check, X } from "lucide-react";

export default function AdminSettings() {
  const { user, updateToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmNewPassword,
  };

  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!allValid) {
      setError("Please meet all password requirements");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
      // Update token in localStorage
      if (data.token) {
        updateToken(data.token);
      }
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-[12px] ${ok ? "text-emerald-600" : "text-gray-400"}`}>
      {ok ? <Check size={13} /> : <X size={13} />}
      {label}
    </div>
  );

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-[13px] text-gray-500">Manage your account password</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-[13px] text-gray-500">Signed in as</p>
          <p className="text-[14px] font-semibold text-gray-900 mt-0.5">{user?.email}</p>
        </div>

        <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Change Password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">{error}</div>
          )}
          {success && (
            <div className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 font-medium">{success}</div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {newPassword.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-1.5">
              <CheckItem ok={checks.length} label="Min 8 characters" />
              <CheckItem ok={checks.uppercase} label="Uppercase letter" />
              <CheckItem ok={checks.lowercase} label="Lowercase letter" />
              <CheckItem ok={checks.number} label="Number" />
              <CheckItem ok={checks.special} label="Special character" />
              <CheckItem ok={checks.match} label="Passwords match" />
            </div>
          )}

          <button type="submit" disabled={loading || !allValid}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-[14px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm mt-2">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
