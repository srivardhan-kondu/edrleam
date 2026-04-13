import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import TrainerLayout from "./layouts/TrainerLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminProjects from "./pages/admin/Projects";
import AdminProjectDetail from "./pages/admin/ProjectDetail";
import AdminTrainers from "./pages/admin/Trainers";
import AdminAssignments from "./pages/admin/Assignments";
import AdminFinancials from "./pages/admin/Financials";
import AdminColleges from "./pages/admin/Colleges";
import AdminCollegeDetail from "./pages/admin/CollegeDetail";
import AdminSettings from "./pages/admin/Settings";

import TrainerDashboard from "./pages/trainer/Dashboard";
import TrainerColleges from "./pages/trainer/Colleges";
import TrainerCollegeDetail from "./pages/trainer/CollegeDetail";
import TrainerAssignments from "./pages/trainer/Assignments";
import TrainerNotifications from "./pages/trainer/Notifications";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/trainer"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="projects/:id" element={<AdminProjectDetail />} />
          <Route path="trainers" element={<AdminTrainers />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="financials" element={<AdminFinancials />} />
          <Route path="colleges" element={<AdminColleges />} />
          <Route path="colleges/:name" element={<AdminCollegeDetail />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Trainer Routes */}
        <Route path="/trainer" element={<ProtectedRoute role="trainer"><TrainerLayout /></ProtectedRoute>}>
          <Route index element={<TrainerDashboard />} />
          <Route path="colleges" element={<TrainerColleges />} />
          <Route path="colleges/:name" element={<TrainerCollegeDetail />} />
          <Route path="assignments" element={<TrainerAssignments />} />
          <Route path="notifications" element={<TrainerNotifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
