import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LiveActivityProvider } from "./context/LiveActivityContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PMDashboard from "./pages/PMDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";

function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) return <p className="centered">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;

  // The frontend picks which dashboard to render for convenience only.
  // Every request each dashboard makes is independently re-scoped by the
  // backend, so this switch is UX, not the security boundary.
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PM") return <PMDashboard />;
  return <DeveloperDashboard />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <p className="centered">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <LiveActivityProvider>
      <Layout>
        <RoleRouter />
      </Layout>
    </LiveActivityProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
