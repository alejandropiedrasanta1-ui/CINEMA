import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Search, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import { getEventConfig } from "@/lib/eventConfig";

const EVENT_HEX = {
  "Boda":              { fg: "#be185d", bg: "#fdf2f8", border: "#fbcfe8" },
  "Quinceañera":       { fg: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
  "Fiesta Social":     { fg: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  "Evento Corporativo":{ fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  "Conferencia":       { fg: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
  "Otro":              { fg: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
};

const YEAR_RANGE = 10;

function getColor(type) { return EVENT_HEX[type] || EVENT_HEX["Otro"]; }

function MonthDistribution({ events, year, month, language }) {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter(e => e.event_date?.startsWith(monthStr));
  const counts = monthEvents.reduce((a, e) => {
    a[e.event_type || "Otro"] = (a[e.event_type || "Otro"] || 0) + 1;
    return a;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-xs font-medium">
        {language === "es" ? "Sin eventos este mes" : "No events this month"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([type, count], i) => {
        const cfg = getEventConfig(type);
        const Icon = cfg.icon;
        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 p-3 rounded-2xl"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.fg + "1c" }}
            >
              <Icon size={14} style={{ color: cfg.fg }} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate leading-tight" style={{ color: cfg.fg }}>{type}</p>
              <p className="text-[13px] font-black leading-tight" style={{ color: cfg.fg }}>
                {count}
                <span className="text-[10px] font-medium ml-1" style={{ opacity: 0.6 }}>
                  {language === "es" ? (count === 1 ? "evento" : "eventos") : (count === 1 ? "event" : "events")}
                </span>
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function YearActivity({ events, year, currentMonth, language, onMonthClick }) {
  const MONTH_ABBR_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MONTH_ABBR_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const abbr = language === "es" ? MONTH_ABBR_ES : MONTH_ABBR_EN;
  const counts = Array(12).fill(0);
  events.forEach(e => {
    if (e.event_date?.startsWith(`${year}-`)) {
      const m = parseInt(e.event_date.split("-")[1]) - 1;
      if (m >= 0 && m < 12) counts[m]++;
    }
  });
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-1 h-20 pt-2">
      {counts.map((count, i) => {
        const isActive = i === currentMonth;
        const pct = Math.max(count / max, count > 0 ? 0.08 : 0);
        return (
          <motion.div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => onMonthClick(i)}
            title={`${abbr[i]}: ${count}`}
            whileHover={{ scaleY: 1.05 }}
            style={{ originY: 1 }}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${pct * 52}px` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              style={{
                background: isActive
                  ? "linear-gradient(180deg, var(--t-from), var(--t-to))"
                  : count > 0 ? "linear-gradient(180deg,#94a3b8,#cbd5e1)" : "#e2e8f0",
                boxShadow: isActive ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
                minHeight: count > 0 ? "4px" : "2px",
              }}
              className="w-full rounded-t-full"
            />
            <span className={`text-[9px] font-bold transition-colors ${isActive ? "gradient-text" : count > 0 ? "text-slate-500" : "text-slate-300"}`}>
              {abbr[i]}
            </span>
            {count > 0 && (
              <span className={`text-[8px] font-black ${isActive ? "text-indigo-500" : "text-slate-400"}`}>{count}</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { tr, language, swapNameEventType } = useSettings();

  useEffect(() => { getCalendarEvents().then(setEvents).catch(console.error); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getEventsForDay = useCallback((day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.event_date === dateStr);
  }, [events, year, month]);

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (day) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const goTo = (y, m, dir) => { setDirection(dir); setCurrentDate(new Date(y, m, 1)); };
  const prev = () => month === 0 ? goTo(year - 1, 11, -1) : goTo(year, month - 1, -1);
  const next = () => month === 11 ? goTo(year + 1, 0, 1) : goTo(year, month + 1, 1);
  const reload = () => getCalendarEvents().then(setEvents).catch(console.error);

  const yearList = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => today.getFullYear() - YEAR_RANGE + i);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            {tr.nav.calendar}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{tr.calendar.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSearch(s => !s)}
            data-testid="calendar-search-toggle"
            className={`p-2.5 rounded-full text-sm font-bold transition-all ${showSearch ? "btn-primary text-white" : "glass text-slate-600 hover:bg-white/50"}`}
          >
            <Search size={15} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            data-testid="new-event-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold"
          >
            <Plus size={16} /> {tr.common.newReservation}
          </motion.button>
        </div>
      </motion.div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap">
              <Search size={15} className="text-slate-400 shrink-0" />
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === "es" ? "Mes" : "Month"}
                  </label>
                  <select
                    value={month}
                    onChange={e => goTo(year, parseInt(e.target.value), 0)}
                    data-testid="calendar-month-select"
                    className="bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    {tr.months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === "es" ? "Año" : "Year"}
                  </label>
                  <select
                    value={year}
                    onChange={e => goTo(parseInt(e.target.value), month, 0)}
                    data-testid="calendar-year-select"
                    className="bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    {yearList.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => goTo(today.getFullYear(), today.getMonth(), 0)}
                  data-testid="calendar-today-btn"
                  className="self-end px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold"
                >
                  {language === "es" ? "Hoy" : "Today"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-3xl overflow-hidden"
      >
        {/* Nav header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
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
              initial={{ opacity: 0, y: direction * 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction * -8 }}
              transition={{ duration: 0.22 }}
              className="text-xl font-black text-slate-900 cursor-pointer select-none hover:opacity-70 transition-opacity"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              onClick={() => setShowSearch(s => !s)}
              data-testid="calendar-month-title"
            >
              {tr.months[month]} {year}
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

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-white/10 border-b border-white/20">
          {tr.days.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7" data-testid="calendar-grid">
          {cells.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const visible = dayEvents.slice(0, 3);
            const extra = dayEvents.length - visible.length;
            const past = day ? isPast(day) : false;
            return (
              <div
                key={i}
                className={`min-h-[110px] p-2 border-r border-b border-white/20 last:border-r-0 transition-colors ${!day ? "bg-slate-50/20" : past ? "bg-slate-50/30" : "hover:bg-white/30"}`}
                data-testid={day ? `calendar-day-${day}` : undefined}
              >
                {day && (
                  <>
                    <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1.5 font-bold transition-all ${isToday(day) ? "theme-today" : past ? "text-slate-300" : "text-slate-700 hover:bg-white/60"}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {visible.map(ev => {
                        const c = getColor(ev.event_type);
                        const cfg = getEventConfig(ev.event_type);
                        const EvIcon = cfg.icon;
                        return (
                          <motion.div
                            key={ev.id}
                            whileHover={{ scale: 1.02, x: 1 }}
                            onClick={() => navigate(`/reservaciones/${ev.id}`)}
                            style={{ borderLeftColor: c.fg, background: c.bg }}
                            className="flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-r-lg rounded-l-sm border-l-[3px] cursor-pointer"
                            data-testid={`calendar-event-${ev.id}`}
                          >
                            <EvIcon size={9} style={{ color: c.fg }} strokeWidth={2.2} className="flex-shrink-0" />
                            <span className="text-[10px] font-bold truncate leading-tight" style={{ color: c.fg }}>
                              {ev.event_type || ev.client_name}
                            </span>
                          </motion.div>
                        );
                      })}
                      {extra > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 pl-1 block">+{extra} más</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Legend row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-2 mt-4"
      >
        {Object.entries(EVENT_HEX).map(([type, c]) => {
          const cfg = getEventConfig(type);
          const LIcon = cfg.icon;
          return (
            <motion.span
              key={type}
              whileHover={{ scale: 1.05, y: -1 }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold cursor-default"
              style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
            >
              <LIcon size={11} strokeWidth={2} />
              {type}
            </motion.span>
          );
        })}
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass rounded-3xl p-6 mt-5"
        data-testid="calendar-charts"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center">
            <BarChart2 size={15} className="text-white" />
          </div>
          <h2 className="text-base font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            {language === "es" ? "Análisis del Calendario" : "Calendar Analysis"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly distribution with icons */}
          <div>
            <p className="text-sm font-black text-slate-700 mb-3" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {language === "es" ? `Tipos — ${tr.months[month]}` : `Types — ${tr.months[month]}`}
            </p>
            <MonthDistribution events={events} year={year} month={month} language={language} />
          </div>

          {/* Yearly activity bars */}
          <div>
            <p className="text-sm font-black text-slate-700 mb-1" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {language === "es" ? `Actividad ${year}` : `Activity ${year}`}
            </p>
            <p className="text-xs text-slate-400 mb-3">
              {language === "es" ? "Clic en un mes para ir a él" : "Click a month to navigate"}
            </p>
            <YearActivity
              events={events}
              year={year}
              currentMonth={month}
              language={language}
              onMonthClick={(m) => goTo(year, m, m > month ? 1 : -1)}
            />
          </div>
        </div>
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
