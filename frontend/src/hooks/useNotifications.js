import { useEffect, useRef, useCallback } from 'react';
import { getReservations } from '@/lib/api';

export function useNotifications() {
  const timerRef  = useRef(null);
  const enabledRef = useRef(false);

  /* ── Build and fire one native notification ──────────────────── */
  function fireNotification(ev, tag = null) {
    const daysLeft = Math.round(
      (new Date(ev.event_date + 'T12:00:00') - new Date()) / 86400000
    );
    const when =
      daysLeft === 0 ? 'HOY' :
      daysLeft === 1 ? 'mañana' :
      `en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`;
    const body = [ev.client_name, when, ev.venue].filter(Boolean).join(' · ');
    return new Notification(`${ev.event_type} — Cinema Productions`, {
      body,
      icon: '/logo.png',
      tag: tag || ev.id,
      requireInteraction: false,
    });
  }

  /* ── Scheduled reminder: fires only at configured time ──────── */
  const scheduledCheck = useCallback(async () => {
    if (!enabledRef.current) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const reminderTime = localStorage.getItem('cp_reminder_time') || '09:00';
    const now  = new Date();
    const hh   = String(now.getHours()).padStart(2, '0');
    const mm   = String(now.getMinutes()).padStart(2, '0');
    const tick = `${hh}:${mm}`;

    if (tick !== reminderTime) return;          // Not the right minute

    // Dedup — fire only once per configured time per calendar day
    const dedupKey = `cp_notif_${now.toISOString().slice(0, 10)}_${tick}`;
    if (localStorage.getItem(dedupKey)) return;
    localStorage.setItem(dedupKey, '1');

    try {
      const today = now.toISOString().slice(0, 10);
      const days  = parseInt(localStorage.getItem('cp_reminder_days') || '3', 10);
      const end   = new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);

      const all      = await getReservations();
      const upcoming = all.filter(
        r => r.event_date >= today &&
             r.event_date <= end  &&
             r.status !== 'Cancelado' &&
             r.status !== 'Completado'
      );
      upcoming.forEach(ev => fireNotification(ev));
    } catch {}
  }, []);

  /* ── Immediate test: shows nearest upcoming event right now ─── */
  const notifyImmediate = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return { ok: false, reason: 'no-permission' };
    }
    try {
      const all    = await getReservations();
      const today  = new Date().toISOString().slice(0, 10);
      const sorted = all
        .filter(r => r.event_date >= today && r.status !== 'Cancelado' && r.status !== 'Completado')
        .sort((a, b) => a.event_date.localeCompare(b.event_date));

      if (!sorted.length) {
        new Notification('Cinema Productions', {
          body: 'Sin eventos próximos pendientes.',
          icon: '/logo.png',
          tag: 'cp-no-events',
        });
        return { ok: true, count: 0 };
      }

      // Show first 3 upcoming events
      sorted.slice(0, 3).forEach((ev, i) =>
        setTimeout(() => fireNotification(ev, `cp-immediate-${ev.id}`), i * 800)
      );
      return { ok: true, count: sorted.length };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }, []);

  /* ── Start / stop polling (every 60 s) ──────────────────────── */
  const start = useCallback((enabled) => {
    enabledRef.current = enabled;
    if (timerRef.current) clearInterval(timerRef.current);
    if (enabled) {
      scheduledCheck();
      timerRef.current = setInterval(scheduledCheck, 60_000); // check every minute
    }
  }, [scheduledCheck]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { start, notifyImmediate };
}
