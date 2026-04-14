import { motion } from "framer-motion";
import { Download, Globe, DollarSign, Palette, FileText } from "lucide-react";
import { useSettings, THEMES, CURRENCIES } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Section({ icon: Icon, title, desc, children }) {
  return (
    <motion.div variants={item} className="glass rounded-3xl p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center">
          <Icon size={15} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{title}</h2>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function Settings() {
  const { language, currency, theme, tr, changeLanguage, changeCurrency, changeTheme } = useSettings();
  const { toast } = useToast();
  const s = tr.settings;

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/reservations?format=${format}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "reservaciones.json" : "reservaciones.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: s.downloadCSV.replace("Descargar", "").replace("Download", "").trim() + " ✓" });
    } catch {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  };

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{s.title}</h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">{s.subtitle}</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        {/* Language */}
        <Section icon={Globe} title={s.langTitle} desc={s.langDesc}>
          <div className="flex gap-3">
            {[{ code: "es", flag: "🇲🇽", label: "Español" }, { code: "en", flag: "🇺🇸", label: "English" }].map(l => (
              <motion.button
                key={l.code}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => changeLanguage(l.code)}
                data-testid={`lang-${l.code}`}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all flex-1 justify-center ${
                  language === l.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"
                }`}
              >
                <span className="text-base">{l.flag}</span> {l.label}
                {language === l.code && <span className="text-[10px] opacity-70 ml-1">✓</span>}
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Currency */}
        <Section icon={DollarSign} title={s.currencyTitle} desc={s.currencyDesc}>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map(c => (
              <motion.button
                key={c.code}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => changeCurrency(c.code)}
                data-testid={`currency-${c.code}`}
                className={`flex flex-col items-center py-3 px-2 rounded-2xl text-xs font-bold transition-all ${
                  currency === c.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"
                }`}
              >
                <span className="text-base font-black">{c.symbol} {c.code}</span>
                <span className={`text-[10px] mt-0.5 ${currency === c.code ? "text-white/70" : "text-slate-400"}`}>{c.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Colors */}
        <Section icon={Palette} title={s.colorsTitle} desc={s.colorsDesc}>
          <div className="grid grid-cols-6 gap-3">
            {Object.values(THEMES).map(t => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => changeTheme(t.id)}
                data-testid={`theme-${t.id}`}
                className="flex flex-col items-center gap-2"
                title={t.name}
              >
                <div
                  className="w-11 h-11 rounded-full transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                    boxShadow: theme === t.id
                      ? `0 0 0 3px white, 0 0 0 5px ${t.from}, 0 8px 20px ${t.shadow}`
                      : `0 4px 12px ${t.shadow}`,
                    transform: theme === t.id ? "scale(1.15)" : "scale(1)",
                  }}
                />
                <span className="text-[10px] font-bold text-slate-500">{t.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Export */}
        <Section icon={FileText} title={s.exportTitle} desc={s.exportDesc}>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleExport("csv")}
              data-testid="export-csv-btn"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl btn-primary text-white text-sm font-bold flex-1 justify-center"
            >
              <Download size={15} /> {s.downloadCSV}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleExport("json")}
              data-testid="export-json-btn"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl glass border-white/60 text-slate-700 text-sm font-bold flex-1 justify-center hover:bg-white/50 transition-all"
            >
              <Download size={15} /> {s.downloadJSON}
            </motion.button>
          </div>
        </Section>
      </motion.div>
    </div>
  );
}
