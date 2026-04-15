import { Heart, Crown, PartyPopper, Briefcase, Monitor, CalendarDays } from "lucide-react";

export const EVENT_CONFIG = {
  "Boda":               { fg: "#be185d", bg: "#fdf2f8", border: "#fbcfe8", icon: Heart },
  "Quinceañera":        { fg: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff", icon: Crown },
  "Fiesta Social":      { fg: "#c2410c", bg: "#fff7ed", border: "#fed7aa", icon: PartyPopper },
  "Evento Corporativo": { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: Briefcase },
  "Conferencia":        { fg: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: Monitor },
  "Otro":               { fg: "#475569", bg: "#f8fafc", border: "#e2e8f0", icon: CalendarDays },
};

export const getEventConfig = (type) => EVENT_CONFIG[type] || EVENT_CONFIG["Otro"];
