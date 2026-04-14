import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SettingsProvider } from "@/context/SettingsContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Reservations from "@/pages/Reservations";
import ReservationDetail from "@/pages/ReservationDetail";
import CalendarView from "@/pages/CalendarView";
import Settings from "@/pages/Settings";
import Socios from "@/pages/Socios";
import { Toaster } from "@/components/ui/toaster";

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.2 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ minHeight: "100%" }}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reservaciones" element={<Reservations />} />
          <Route path="/reservaciones/:id" element={<ReservationDetail />} />
          <Route path="/calendario" element={<CalendarView />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="/socios" element={<Socios />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <SettingsProvider>
      <div className="App">
        <div className="mesh-bg" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
        </div>
        <BrowserRouter>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BrowserRouter>
        <Toaster />
      </div>
    </SettingsProvider>
  );
}

export default App;
