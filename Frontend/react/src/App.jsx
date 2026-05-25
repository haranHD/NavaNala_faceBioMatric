import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import FaceRegistration from "./pages/FaceRegistration";
import LiveAttendance from "./pages/LiveAttendance";
import AttendanceHistory from "./pages/AttendanceHistory";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute><EmployeeManagement /></ProtectedRoute>
          } />
          <Route path="/admin/register-face" element={
            <ProtectedRoute><FaceRegistration /></ProtectedRoute>
          } />
          <Route path="/admin/live-attendance" element={
            <ProtectedRoute><LiveAttendance /></ProtectedRoute>
          } />
          <Route path="/admin/history" element={
            <ProtectedRoute><AttendanceHistory /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;