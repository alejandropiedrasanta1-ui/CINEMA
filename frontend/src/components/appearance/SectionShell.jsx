import { useContext, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";
import { SectionSearchContext, matchesSearch, extractText, normalizeText } from "@/lib/sectionSearch";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export function Section({ icon: Icon, title, desc, children, badge, isNew, keywords = "", id, defaultOpen = false }) {
  const query = useContext(SectionSearchContext);
  const [open, setOpen] = useState(defaultOpen);
  const searching = !!(query && query.trim());
  const slug = id || normalizeText(title).replace(/\s+/g, "-");

  const matched = useMemo(() => {
    if (!searching) return true;
    return matchesSearch(query, `${title} ${desc} ${keywords} ${extractText(children)}`);
  }, [searching, query, title, desc, keywords, children]);

  if (searching && !matched) return null;
  const isOpen = searching || open;

  return (
    <motion.div variants={fadeIn} className="glass rounded-3xl overflow-hidden" data-testid={`section-${slug}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}
        data-testid={`section-toggle-${slug}`}
        className="w-full flex items-center justify-between p-7 cursor-pointer select-none hover:bg-white/20 transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Icon size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {title}
              {isNew && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 uppercase tracking-wide">NUEVO</span>}
            </h2>
            <p className="text-xs text-slate-400 truncate">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {badge && <div onClick={e => e.stopPropagation()}>{badge}</div>}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown size={16} className="text-slate-400" />
          </motion.div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-7">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SectionSearchBar({ value, onChange, placeholder, testId }) {
  return (
    <div className="relative mb-5">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="w-full pl-11 pr-10 py-3.5 glass rounded-2xl border-white/60 bg-transparent text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          data-testid={`${testId}-clear`}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
