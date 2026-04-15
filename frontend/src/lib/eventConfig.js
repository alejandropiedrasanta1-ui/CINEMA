import {
  Heart, Crown, PartyPopper, Briefcase, Monitor, CalendarDays,
  Music, Mic, Camera, Film, Star, Gift, Cake, Trophy, Users,
  Building2, Globe, Sparkles, Flame, Leaf, Coffee, Utensils,
  Plane, Home, BookOpen, Award, Mountain, Anchor, Sun, Zap,
  Palette, Wand2, GraduationCap, Baby, Gem, Ticket,
} from "lucide-react";

export const EVENT_TYPES = [
  "Boda", "Quinceañera", "Fiesta Social",
  "Evento Corporativo", "Conferencia", "Otro",
];

export const AVAILABLE_COLORS = [
  // Pinks / Reds
  "#be185d", "#e11d48", "#db2777", "#c026d3", "#ec4899",
  // Purples
  "#7e22ce", "#6d28d9", "#7c3aed", "#9333ea", "#a855f7",
  // Blues
  "#1d4ed8", "#2563eb", "#0ea5e9", "#0891b2", "#0369a1",
  // Greens
  "#0f766e", "#15803d", "#16a34a", "#059669", "#10b981",
  // Oranges / Warm
  "#c2410c", "#ea580c", "#f97316", "#d97706", "#b45309",
  // Dark / Neutrals
  "#475569", "#334155", "#1e293b", "#64748b", "#7f1d1d",
];

export const AVAILABLE_ICONS = [
  { name: "Heart",         component: Heart },
  { name: "Crown",         component: Crown },
  { name: "PartyPopper",   component: PartyPopper },
  { name: "Briefcase",     component: Briefcase },
  { name: "Monitor",       component: Monitor },
  { name: "CalendarDays",  component: CalendarDays },
  { name: "Music",         component: Music },
  { name: "Mic",           component: Mic },
  { name: "Camera",        component: Camera },
  { name: "Film",          component: Film },
  { name: "Star",          component: Star },
  { name: "Gift",          component: Gift },
  { name: "Cake",          component: Cake },
  { name: "Trophy",        component: Trophy },
  { name: "Users",         component: Users },
  { name: "Building2",     component: Building2 },
  { name: "Globe",         component: Globe },
  { name: "Sparkles",      component: Sparkles },
  { name: "Flame",         component: Flame },
  { name: "Leaf",          component: Leaf },
  { name: "Coffee",        component: Coffee },
  { name: "Utensils",      component: Utensils },
  { name: "Plane",         component: Plane },
  { name: "Home",          component: Home },
  { name: "BookOpen",      component: BookOpen },
  { name: "Award",         component: Award },
  { name: "Mountain",      component: Mountain },
  { name: "Anchor",        component: Anchor },
  { name: "Sun",           component: Sun },
  { name: "Zap",           component: Zap },
  { name: "Palette",       component: Palette },
  { name: "Wand2",         component: Wand2 },
  { name: "GraduationCap", component: GraduationCap },
  { name: "Baby",          component: Baby },
  { name: "Gem",           component: Gem },
  { name: "Ticket",        component: Ticket },
];

export const ICON_MAP = Object.fromEntries(
  AVAILABLE_ICONS.map(({ name, component }) => [name, component])
);

const DEFAULT_CONFIGS = {
  "Boda":               { fg: "#be185d", bg: "#fdf2f8", border: "#fbcfe8", icon: Heart,        iconName: "Heart" },
  "Quinceañera":        { fg: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff", icon: Crown,        iconName: "Crown" },
  "Fiesta Social":      { fg: "#c2410c", bg: "#fff7ed", border: "#fed7aa", icon: PartyPopper,  iconName: "PartyPopper" },
  "Evento Corporativo": { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: Briefcase,    iconName: "Briefcase" },
  "Conferencia":        { fg: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: Monitor,      iconName: "Monitor" },
  "Otro":               { fg: "#475569", bg: "#f8fafc", border: "#e2e8f0", icon: CalendarDays, iconName: "CalendarDays" },
};

// Keep for backward compat
export const EVENT_CONFIG = DEFAULT_CONFIGS;

// Module-level overrides — initialized from localStorage on load for immediate effect
let _overrides = {};
try {
  _overrides = JSON.parse(localStorage.getItem("cp_event_configs") || "{}");
} catch {}

export function setEventConfigOverrides(overrides) {
  _overrides = overrides || {};
}

// Derive soft bg/border hex (8-digit) from a solid hex fg
export function deriveEventColors(fg) {
  return { fg, bg: fg + "14", border: fg + "38" };
}

// Return the display name for an event type (custom or original)
export function getEventTypeName(type) {
  return _overrides[type]?.name || type;
}

export const getEventConfig = (type) => {
  const defaults = DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS["Otro"];
  const custom = _overrides[type];
  if (custom && (custom.fg || custom.iconName)) {
    const fg    = custom.fg || defaults.fg;
    const icon  = ICON_MAP[custom.iconName] || defaults.icon;
    return { ...defaults, fg, bg: fg + "14", border: fg + "38", icon, iconName: custom.iconName || defaults.iconName };
  }
  return defaults;
};
