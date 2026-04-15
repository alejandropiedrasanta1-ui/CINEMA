import { useEffect, useRef, useCallback } from "react";

const API = process.env.REACT_APP_BACKEND_URL;

// Convert base64url to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function useNotifications() {
  const pollingRef    = useRef(null);
  const sentTodayRef  = useRef(new Set());
  const swRegRef      = useRef(null);

  // ── Register Service Worker + subscribe to Web Push ─────────
  const setupPush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      // Register SW
      const reg = await navigator.serviceWorker.register("/sw.js");
      swRegRef.current = reg;

      // Get VAPID public key
      const res     = await fetch(`${API}/api/push/vapid-key`);
      const { publicKey } = await res.json();
      if (!publicKey) return;

      // Subscribe
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to backend
      await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch (err) {
      console.warn("[useNotifications] Push setup:", err);
    }
  }, []);

  // ── Request Notification permission ─────────────────────────
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") {
      await setupPush();
      return "granted";
    }
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    if (result === "granted") await setupPush();
    return result;
  }, [setupPush]);

  // ── Show native notification (fallback for in-page polling) ──
  const showNotification = useCallback((title, body, url = "/dashboard") => {
    if (Notification.permission !== "granted") return;
    // If SW is active, use it; else use basic Notification API
    if (swRegRef.current) {
      swRegRef.current.showNotification(title, {
        body, icon: "/logo.png", badge: "/logo.png",
        data: { url }, requireInteraction: true,
      });
    } else {
      const n = new Notification(title, { body, icon: "/logo.png" });
      n.onclick = () => { window.focus(); n.close(); };
    }
  }, []);

  // ── In-page polling reminder (for browsers without SW push) ──
  const startPolling = useCallback(async () => {
    if (pollingRef.current) return;

    const poll = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        if (sentTodayRef.current._lastDay !== today) {
          sentTodayRef.current.clear();
          sentTodayRef.current._lastDay = today;
        }

        const settings = await fetch(`${API}/api/settings`).then((r) => r.json());
        if (!settings.reminders_enabled) return;

        const reminderTime = localStorage.getItem("cp_reminder_time") || "09:00";
        const now          = new Date();
        const currentHHMM  = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        if (currentHHMM !== reminderTime) return;

        const days       = parseInt(settings.reminder_days || 3);
        const targetDate = new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
        const key        = `${today}_${reminderTime}_${targetDate}`;
        if (sentTodayRef.current.has(key)) return;
        sentTodayRef.current.add(key);

        const all = await fetch(`${API}/api/reservations`).then((r) => r.json());
        const upcoming = all.filter(
          (r) => r.event_date === targetDate && !["Cancelado", "Completado"].includes(r.status)
        );
        if (!upcoming.length) return;

        const title = `Recordatorio: ${upcoming.length} evento(s) en ${days} día(s)`;
        const body  = upcoming.slice(0, 3).map((r) => r.client_name).join(", ");
        showNotification(title, body);
      } catch (err) {
        console.warn("[useNotifications] poll error:", err);
      }
    };

    pollingRef.current = setInterval(poll, 60_000);
    poll(); // immediate first check
  }, [showNotification]);

  // ── Init on mount ─────────────────────────────────────────────
  useEffect(() => {
    // Auto-setup if permission already granted
    if (Notification.permission === "granted") {
      setupPush().then(() => startPolling());
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [setupPush, startPolling]);

  return { requestPermission, showNotification, startPolling };
}
