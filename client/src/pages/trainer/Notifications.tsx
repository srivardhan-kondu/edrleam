import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/api";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  _id: string; title: string; message: string; type: string; read: boolean; link: string; createdAt: string;
}

export default function TrainerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = () => {
    fetch("/api/notifications", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load notifications");
        return data;
      })
      .then((d) => {
        setNotifications(Array.isArray(d) ? d : []);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load notifications");
        setNotifications([]);
        setLoading(false);
      });
  };
  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PUT", headers: authHeaders() });
    fetchNotifications();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-16 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Bell size={24} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
          <p className="text-[13px] text-gray-400 mt-1">You&apos;ll be notified about new assignments and updates.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n._id} className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors ${!n.read ? "bg-indigo-50/30" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-indigo-500" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${!n.read ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
