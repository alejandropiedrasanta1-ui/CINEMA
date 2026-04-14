import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, List, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reservaciones", label: "Reservaciones", icon: List },
  { path: "/calendario", label: "Calendario", icon: CalendarDays },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ position: "relative", zIndex: 1 }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen glass-sidebar fixed left-0 top-0 z-20">
        <div className="px-6 py-6 border-b border-white/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                Eventos
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Gestión de Reservas</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/60"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/40">
          <p className="text-[10px] text-slate-400 font-medium">v1.0 · Liquid Glass</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 glass border-b border-white/50">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <h1 className="text-base font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              Eventos
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-toggle"
            className="p-2 rounded-2xl text-slate-600 hover:bg-white/50 transition-all"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-20 glass-strong pt-16"
          >
            <nav className="px-4 py-4 space-y-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                        : "text-slate-600 hover:bg-white/60"
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-16 md:pt-0 min-h-screen px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
