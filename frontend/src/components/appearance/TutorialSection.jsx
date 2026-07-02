import { motion } from "framer-motion";
import { GraduationCap, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Section } from "./SectionShell";

export function TutorialSection() {
  const { language, tutorialEnabled, changeTutorialEnabled, startTour } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const es = language === "es";

  return (
    <Section
      icon={GraduationCap}
      isNew
      id="tutorial-section"
      title={es ? "Tutorial de Bienvenida" : "Welcome Tutorial"}
      desc={es ? "Guía interactiva de 18 pasos por todas las páginas" : "18-step interactive guide across all pages"}
      keywords="tutorial bienvenida guia pasos ayuda onboarding aprender desactivar tour"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl glass border border-white/50">
          <div>
            <p className="text-sm font-bold text-slate-700">{es ? "Mostrar tutorial al iniciar" : "Show tutorial on startup"}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {es ? "Se muestra automáticamente la primera vez que abres la app" : "Shows automatically the first time you open the app"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { changeTutorialEnabled(!tutorialEnabled); toast({ title: tutorialEnabled ? (es ? "Tutorial desactivado" : "Tutorial disabled") : (es ? "Tutorial activado ✓" : "Tutorial enabled ✓") }); }}
            data-testid="tutorial-enabled-toggle"
            className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${tutorialEnabled ? "btn-primary" : "bg-slate-200"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${tutorialEnabled ? "left-[26px]" : "left-0.5"}`} />
          </button>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { navigate("/dashboard"); setTimeout(() => startTour(), 300); }}
          data-testid="start-tour-btn"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl btn-primary text-white text-sm font-bold">
          <Play size={15} /> {es ? "Ver el tutorial ahora" : "Watch tutorial now"}
        </motion.button>
      </div>
    </Section>
  );
}
