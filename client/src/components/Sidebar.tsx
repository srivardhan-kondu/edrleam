import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ClipboardList,
  IndianRupee,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useState } from "react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/colleges", label: "Colleges", icon: Building2 },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/trainers", label: "Trainers", icon: Users },
  { href: "/admin/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/admin/financials", label: "Financials", icon: IndianRupee },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const trainerLinks = [
  { href: "/trainer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trainer/colleges", label: "Colleges", icon: Building2 },
  { href: "/trainer/assignments", label: "My Assignments", icon: ClipboardList },
  { href: "/trainer/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = user?.role === "admin" ? adminLinks : trainerLinks;

  if (!user) return null;

  const navContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <Link to={user.role === "admin" ? "/admin" : "/trainer"} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <GraduationCap size={18} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight text-gray-900 block leading-none">Edleam</span>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Operations</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Menu</p>
        {links.map((link) => {
          const isActive =
            location.pathname === link.href ||
            (link.href !== "/admin" && link.href !== "/trainer" && location.pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setOpen(false)}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-indigo-600" : ""} />
              <span className="flex-1">{link.label}</span>
              {isActive && <ChevronRight size={14} className="text-indigo-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{user.name}</p>
            <p className="text-[11px] text-gray-400 capitalize">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-white transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3.5 left-3 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-sm lg:hidden hover:bg-gray-50 transition-colors"
        aria-label="Toggle navigation"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-[240px] bg-white border-r border-gray-200/80 flex-col shrink-0">
        {navContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[260px] bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
