import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ReservationForm from "@/components/ReservationForm";

const EVENT_TYPE_COLORS = {
  "Boda": "bg-pink-100 text-pink-800 border-pink-200",
  "Quinceañera": "bg-purple-100 text-purple-800 border-purple-200",
  "Fiesta Social": "bg-orange-100 text-orange-800 border-orange-200",
  "Evento Corporativo": "bg-blue-100 text-blue-800 border-blue-200",
  "Conferencia": "bg-teal-100 text-teal-800 border-teal-200",
  "Otro": "bg-zinc-100 text-zinc-800 border-zinc-200",
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
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
  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const reload = () => {
    getCalendarEvents().then(setEvents).catch(console.error);
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Calendario
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Vista mensual de eventos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-700 rounded-md text-sm font-medium px-4 py-2 flex items-center gap-2 transition-colors"
          data-testid="new-event-btn"
        >
          <Plus size={16} />
          Nueva Reserva
        </button>
      </div>

      {/* Calendar Card */}
      <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        {/* Month Navigator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <button
            onClick={prev}
            className="p-2 rounded-md hover:bg-zinc-100 text-zinc-600 transition-colors"
            data-testid="prev-month-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={next}
            className="p-2 rounded-md hover:bg-zinc-100 text-zinc-600 transition-colors"
            data-testid="next-month-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100" data-testid="calendar-grid">
          {cells.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={i}
                className={`min-h-[90px] p-1.5 ${day ? "hover:bg-zinc-50" : "bg-zinc-50/50"} transition-colors`}
                data-testid={day ? `calendar-day-${day}` : undefined}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-sm rounded-full mb-1 ${
                        isToday(day)
                          ? "bg-zinc-900 text-white font-bold"
                          : "text-zinc-700"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => navigate(`/reservaciones/${ev.id}`)}
                          className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${
                            EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS["Otro"]
                          }`}
                          title={`${ev.client_name} — ${ev.event_type}`}
                          data-testid={`calendar-event-${ev.id}`}
                        >
                          {ev.client_name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, cls]) => (
          <div key={type} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${cls}`}>
            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
            {type}
          </div>
        ))}
      </div>

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}
