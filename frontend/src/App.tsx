import { Routes, Route, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Commander from "@/pages/Commander";
import Commandes from "@/pages/Commandes";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import AuthCallback from "@/pages/AuthCallback";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  // Emergent auth returns to `#session_id=...`; handle it before any route renders.
  const location = useLocation();
  const isAuthCallback = location.hash?.includes("session_id=");

  return (
    <AuthProvider>
      {isAuthCallback ? (
        <AuthCallback />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/commander"
            element={
              <RequireAuth>
                <Commander />
              </RequireAuth>
            }
          />
          <Route
            path="/commandes"
            element={
              <RequireAuth>
                <Commandes />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <Admin />
              </RequireAuth>
            }
          />
        </Routes>
      )}
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
