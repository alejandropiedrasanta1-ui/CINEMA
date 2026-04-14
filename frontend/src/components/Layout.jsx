import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, List, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reservaciones", label: "Reservaciones", icon: List },
  { path: "/calendario", label: "Calendario", icon: CalendarDays },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-zinc-200 fixed left-0 top-0">
        <div className="px-6 py-5 border-b border-zinc-200">
          <h1 className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Eventos
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Gestión de Reservas</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`
              }
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-zinc-200">
          <p className="text-xs text-zinc-400">v1.0</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-zinc-200 flex items-center justify-between px-4 py-3">
        <h1 className="text-base font-bold text-zinc-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
          Eventos
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
          className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-white pt-14">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-56 pt-0 md:pt-0">
        <div className="pt-14 md:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
