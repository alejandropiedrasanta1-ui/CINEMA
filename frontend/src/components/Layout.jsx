import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarDays, List, Menu, X, SlidersHorizontal, Users } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tr } = useSettings();

  const navItems = [
    { path: "/dashboard",     label: tr.nav.dashboard,     icon: LayoutDashboard },
    { path: "/reservaciones", label: tr.nav.reservations,  icon: List },
    { path: "/calendario",    label: tr.nav.calendar,      icon: CalendarDays },
    { path: "/socios",        label: tr.nav.socios || "Socios", icon: Users },
    { path: "/ajustes",       label: tr.nav.settings,      icon: SlidersHorizontal },
  ];

  return (
    <div className="flex min-h-screen" style={{ position: "relative", zIndex: 1 }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen glass-sidebar fixed left-0 top-0 z-20">
        <div className="px-6 py-6 border-b border-white/40">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Cinema Productions"
              className="h-8 w-auto rounded-xl"
              style={{ filter: "brightness(0) invert(0)", maxWidth: "110px", objectFit: "contain" }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1.5 pl-0.5">{tr.nav.tagline}</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${path.replace("/", "")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                  isActive ? "nav-active" : "text-slate-600 hover:bg-white/50 hover:text-slate-900 hover:translate-x-0.5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.5} />
                  </motion.span>
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
            <img src="/logo.png" alt="Cinema Productions" className="h-7 w-auto rounded-lg" style={{ maxWidth: "90px", objectFit: "contain" }} />
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle" className="p-2 rounded-2xl text-slate-600 hover:bg-white/50 transition-all">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="md:hidden fixed inset-0 z-20 glass-strong pt-16">
            <nav className="px-4 py-4 space-y-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink key={path} to={path} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${isActive ? "nav-active" : "text-slate-600 hover:bg-white/60"}`}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-16 md:pt-0 min-h-screen">{children}</div>
      </main>
    </div>
  );
}
