import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Eye, EyeOff, Loader2, Lightbulb, ShieldCheck } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { verifyAppPassword } from "@/lib/api";

export default function LockScreen() {
  const { security, unlockApp } = useSettings();
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async (e) => {
    e?.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(false);
    try {
      await verifyAppPassword(password);
      setUnlocking(true);
      setTimeout(() => unlockApp(), 650);
    } catch {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 700);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0e1f 60%, #090812 100%)" }}
      data-testid="lock-screen">

      {/* Floating decorative orbs */}
      <motion.div className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)", top: "8%", left: "12%" }}
        animate={{ y: [0, -30, 0], x: [0, 16, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 70%)", bottom: "5%", right: "8%" }}
        animate={{ y: [0, 26, 0], x: [0, -20, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={unlocking ? { opacity: 0, scale: 1.08, filter: "blur(8px)" } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[min(400px,92vw)] rounded-3xl p-8 text-center"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(24px)", boxShadow: "0 30px 90px rgba(0,0,0,0.5)" }}>

        {/* Lock icon with pulsing rings */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          <motion.div className="absolute inset-0 rounded-3xl border-2 border-indigo-400/40"
            animate={{ scale: [1, 1.55], opacity: [0.55, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />
          <motion.div className="absolute inset-0 rounded-3xl border-2 border-violet-400/40"
            animate={{ scale: [1, 1.85], opacity: [0.45, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.5 }} />
          <motion.div
            animate={error ? { x: [0, -10, 10, -8, 8, 0] } : { y: [0, -4, 0] }}
            transition={error ? { duration: 0.5 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 12px 40px rgba(99,102,241,0.45)" }}>
            {unlocking ? <Unlock size={32} className="text-white" /> : <Lock size={32} className="text-white" />}
          </motion.div>
        </div>

        <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          App Bloqueada
        </h1>
        <p className="text-sm text-slate-400 mb-6">Ingresa tu contraseña para continuar</p>

        <form onSubmit={handleUnlock} className="space-y-3">
          <motion.div animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.45 }} className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              data-testid="lock-password-input"
              className={`w-full px-4 py-3.5 pr-11 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition-all ${error ? "ring-2 ring-red-500/70" : "focus:ring-2 focus:ring-indigo-400/60"}`}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
            />
            <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-bold text-red-400" data-testid="lock-error-msg">
                Contraseña incorrecta — inténtalo de nuevo
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            type="submit" disabled={loading || !password}
            data-testid="lock-unlock-btn"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 30px rgba(99,102,241,0.4)" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? "Verificando…" : "Desbloquear"}
          </motion.button>
        </form>

        {/* Hint */}
        <div className="mt-5">
          {!showHint ? (
            <button onClick={() => setShowHint(true)} data-testid="lock-show-hint-btn"
              className="text-xs font-semibold text-slate-400 hover:text-indigo-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="flex items-start gap-2.5 text-left rounded-2xl px-4 py-3"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
              data-testid="lock-hint-box">
              <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Tu pista</p>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  {security.hint || "No configuraste una pista. Contacta al administrador de tu base de datos."}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
