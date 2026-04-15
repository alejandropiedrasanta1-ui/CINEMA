import { useEffect, useRef, useCallback } from 'react';
import { getPendingNotifications } from '@/lib/api';

const SESSION_KEY = 'cp_notified_today';

function getTodayNotified() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')); }
  catch { return new Set(); }
}
function markTodayNotified(id) {
  const s = getTodayNotified(); s.add(id);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s]));
}

export function useNotifications() {
  const timerRef = useRef(null);
  const enabledRef = useRef(false);

  const notify = useCallback(async () => {
    if (!enabledRef.current) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const events = await getPendingNotifications();
      const notified = getTodayNotified();
      for (const ev of events) {
        if (notified.has(ev.id)) continue;
        const today = new Date().toISOString().slice(0, 10);
        const daysLeft = Math.round((new Date(ev.event_date + 'T12:00:00') - new Date()) / 86400000);
        const when = daysLeft === 0 ? 'HOY' : daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`;
        const body = [ev.client_name, when, ev.venue].filter(Boolean).join(' · ');
        new Notification(`${ev.event_type} — Cinema Productions`, {
          body, icon: '/logo.png', tag: ev.id, requireInteraction: false,
        });
        markTodayNotified(ev.id);
      }
    } catch {}
  }, []);

  const start = useCallback((enabled) => {
    enabledRef.current = enabled;
    if (timerRef.current) clearInterval(timerRef.current);
    if (enabled) {
      notify();
      timerRef.current = setInterval(notify, 30 * 60 * 1000);
    }
  }, [notify]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { start, triggerNow: notify };
}
