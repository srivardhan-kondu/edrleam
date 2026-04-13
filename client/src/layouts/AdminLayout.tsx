import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#fafbfc] lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 min-w-0 overflow-x-hidden">
        <div className="pt-14 lg:pt-8 px-4 pb-8 sm:px-6 lg:px-10 xl:px-12 lg:pb-12 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
