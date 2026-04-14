import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReservationForm from "@/components/ReservationForm";

const EVENT_TYPE_COLORS = {
  "Boda": "bg-pink-100/90 text-pink-700 border-pink-200/60",
  "Quinceañera": "bg-purple-100/90 text-purple-700 border-purple-200/60",
  "Fiesta Social": "bg-orange-100/90 text-orange-700 border-orange-200/60",
  "Evento Corporativo": "bg-blue-100/90 text-blue-700 border-blue-200/60",
  "Conferencia": "bg-teal-100/90 text-teal-700 border-teal-200/60",
  "Otro": "bg-slate-100/90 text-slate-700 border-slate-200/60",
};

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    getCalendarEvents().then(setEvents).catch(console.error);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.event_date === dateStr);
  };

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const prev = () => { setDirection(-1); setCurrentDate(new Date(year, month - 1, 1)); };
  const next = () => { setDirection(1); setCurrentDate(new Date(year, month + 1, 1)); };

  const reload = () => getCalendarEvents().then(setEvents).catch(console.error);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight gradient-text" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Calendario
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">Vista mensual de eventos</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60"
          data-testid="new-event-btn"
        >
          <Plus size={16} />
          Nueva Reserva
        </motion.button>
      </motion.div>

      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-3xl overflow-hidden"
      >
        {/* Month Navigator */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/30">
          <motion.button
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={prev}
            className="p-2.5 rounded-2xl glass hover:bg-white/50 text-slate-600 transition-colors"
            data-testid="prev-month-btn"
          >
            <ChevronLeft size={16} />
          </motion.button>
          <AnimatePresence mode="wait">
            <motion.h2
              key={`${month}-${year}`}
              initial={{ opacity: 0, y: direction * 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction * -10 }}
              transition={{ duration: 0.25 }}
              className="text-xl font-black text-slate-900"
              style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
            >
              {MONTHS[month]} {year}
            </motion.h2>
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={next}
            className="p-2.5 rounded-2xl glass hover:bg-white/50 text-slate-600 transition-colors"
            data-testid="next-month-btn"
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-white/20 bg-white/10">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-black text-slate-500 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7" data-testid="calendar-grid">
          {cells.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <motion.div
                key={i}
                whileHover={day ? { backgroundColor: "rgba(255,255,255,0.45)" } : {}}
                className={`min-h-[90px] p-2 border-r border-b border-white/20 last:border-r-0 transition-colors ${!day ? "bg-slate-50/30" : ""}`}
                data-testid={day ? `calendar-day-${day}` : undefined}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1.5 font-bold transition-all ${
                        isToday(day)
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200"
                          : "text-slate-700 hover:bg-white/60"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.map((ev) => (
                        <motion.div
                          key={ev.id}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => navigate(`/reservaciones/${ev.id}`)}
                          className={`text-xs px-2 py-0.5 rounded-full border truncate cursor-pointer font-bold transition-all ${
                            EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS["Otro"]
                          }`}
                          title={`${ev.client_name} — ${ev.event_type}`}
                          data-testid={`calendar-event-${ev.id}`}
                        >
                          {ev.client_name}
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-2 mt-5"
      >
        {Object.entries(EVENT_TYPE_COLORS).map(([type, cls]) => (
          <span key={type} className={`text-xs px-3 py-1.5 rounded-full border font-bold ${cls}`}>
            {type}
          </span>
        ))}
      </motion.div>

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}
