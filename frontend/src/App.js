import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Reservations from "@/pages/Reservations";
import ReservationDetail from "@/pages/ReservationDetail";
import CalendarView from "@/pages/CalendarView";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reservaciones" element={<Reservations />} />
            <Route path="/reservaciones/:id" element={<ReservationDetail />} />
            <Route path="/calendario" element={<CalendarView />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
