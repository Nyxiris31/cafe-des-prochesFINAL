import { Routes, Route, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Commander from "@/pages/Commander";
import Commandes from "@/pages/Commandes";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import AuthCallback from "@/pages/AuthCallback";
import Profil from "@/pages/Profil";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  const location = useLocation();
  const isAuthCallback = /(?:access|confirmation|recovery|invite|email_change)_token=/.test(
    location.hash,
  );

  return (
    <AuthProvider>
      {isAuthCallback ? (
        <AuthCallback />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profil"
            element={
              <RequireAuth>
                <Profil />
              </RequireAuth>
            }
          />
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
