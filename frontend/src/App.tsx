import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Commander from "@/pages/Commander";
import Commandes from "@/pages/Commandes";
import { Toaster } from "@/components/ui/sonner";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/commander" element={<Commander />} />
        <Route path="/commandes" element={<Commandes />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
