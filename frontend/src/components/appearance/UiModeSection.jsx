import { motion } from "framer-motion";
import { Clapperboard, CheckCircle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Section } from "./SectionShell";

function ClassicPreview() {
  return (
    <div className="relative h-24 w-full overflow-hidden rounded-t-xl" style={{ background: "linear-gradient(135deg,#eff0ff,#fce7f3,#e0f2fe)" }}>
      <div className="absolute left-1.5 top-1.5 bottom-1.5 w-7 rounded-lg" style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(4px)" }}>
        {[0, 1, 2].map(i => <div key={i} className="mx-1.5 mt-1.5 h-1.5 rounded" style={{ background: i === 0 ? "rgba(99,102,241,0.5)" : "rgba(148,163,184,0.35)" }} />)}
      </div>
      <div className="absolute left-10 right-1.5 top-1.5 bottom-1.5 space-y-1.5">
        <div className="h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.8)" }} />
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => <div key={i} className="flex-1 h-10 rounded-lg" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.8)" }} />)}
        </div>
      </div>
    </div>
  );
}

function DavinciPreview() {
  return (
    <div className="relative h-24 w-full overflow-hidden rounded-t-xl" style={{ background: "#161619" }}>
      <div className="absolute left-1.5 top-1.5 bottom-1.5 w-7 rounded" style={{ background: "#222227", border: "1px solid #37373e" }}>
        {[0, 1, 2].map(i => <div key={i} className="mx-1.5 mt-1.5 h-1.5 rounded-sm" style={{ background: i === 0 ? "#e8833a" : "#3d3d45" }} />)}
      </div>
      <div className="absolute left-10 right-1.5 top-1.5 bottom-1.5" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: "4px" }}>
        <div className="rounded" style={{ background: "#232329", border: "1px solid #37373e" }}>
          <div className="h-1.5 m-1 rounded-sm w-1/2" style={{ background: "#e8833a" }} />
        </div>
        <div className="rounded" style={{ background: "#232329", border: "1px solid #37373e" }} />
        <div className="rounded" style={{ background: "#232329", border: "1px solid #37373e" }} />
        <div className="rounded" style={{ background: "#232329", border: "1px solid #37373e" }}>
          <div className="flex items-end gap-0.5 h-full p-1.5">
            {[40, 70, 55, 90].map((h, i) => <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: "#e8833a99" }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UiModeSection() {
  const { language, uiMode, changeUiMode } = useSettings();
  const { toast } = useToast();
  const es = language === "es";

  const modes = [
    { id: "classic", name: "Clásico (Glass)", hint: es ? "Diseño claro con glassmorphismo" : "Light glassmorphism design", Preview: ClassicPreview },
    { id: "davinci", name: "DaVinci Resolve", hint: es ? "Paneles oscuros tipo collage, estética pro de edición" : "Dark collage panels, pro editing look", Preview: DavinciPreview },
  ];

  return (
    <Section
      icon={Clapperboard}
      isNew
      id="ui-mode-section"
      title={es ? "Modo de Diseño Global" : "Global Design Mode"}
      desc={es ? "Cambia TODO el diseño de la app con un clic" : "Change the ENTIRE app design in one click"}
      keywords="davinci resolve collage paneles oscuro edicion profesional distribucion diseño completo modo global"
    >
      <div data-testid="ui-mode-section">
        <p className="text-[10px] text-slate-400 mb-3">
          {es
            ? "El modo DaVinci transforma toda la aplicación: paneles oscuros con bordes, barras densas, acento naranja y distribución tipo collage."
            : "DaVinci mode transforms the whole app: dark bordered panels, dense bars, orange accent and collage layout."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {modes.map(({ id, name, hint, Preview }) => (
            <motion.button key={id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => { changeUiMode(id); toast({ title: `${es ? "Modo" : "Mode"}: ${name} ✓` }); }}
              data-testid={`ui-mode-${id}`}
              className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
              style={{ border: uiMode === id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)" }}>
              <Preview />
              {uiMode === id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center">
                  <CheckCircle size={11} className="text-white" />
                </div>
              )}
              <div className="p-2.5 bg-white/70">
                <p className="text-[11px] font-black text-slate-800">{name}</p>
                <p className="text-[9px] text-slate-400">{hint}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </Section>
  );
}
