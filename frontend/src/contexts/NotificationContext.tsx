import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../services/api';

// ─── types ────────────────────────────────────────────────────────────────────
interface NewTicket {
  id: string;
  title: string;
  department?: string | null;
  created_at: string;
}

interface NotificationContextValue {
  unseenCount: number;
  clearUnseen: () => void;
}

// ─── context ──────────────────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextValue>({
  unseenCount: 0,
  clearUnseen: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// ─── Web Audio beep ───────────────────────────────────────────────────────────
// Reuse a single AudioContext — creating one per sound hit the autoplay policy.
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// Call this on any user interaction so the context leaves "suspended" state.
function unlockAudioCtx() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

async function playNotificationSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Browsers suspend AudioContext until user interaction — resume before playing.
    if (ctx.state === 'suspended') await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {
    // silent fail
  }
}

// ─── browser Notification ────────────────────────────────────────────────────
function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' });
    });
  }
}

// ─── localStorage key for seen IDs ────────────────────────────────────────────
const SEEN_KEY = 'notif_seen_ticket_ids';

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  // keep only the last 200 to avoid unbounded growth
  const arr = Array.from(ids).slice(-200);
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
}

// ─── POLL_INTERVAL ────────────────────────────────────────────────────────────
// 30 s is enough for near-real-time notifications and stays well under rate limits.
const POLL_MS = 30_000;

// ─── Provider ────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unseenCount, setUnseenCount] = useState(0);
  const sinceRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUnseen = useCallback(() => {
    setUnseenCount(0);
  }, []);

  const poll = useCallback(async () => {
    // Only poll when a staff user is logged in
    const token = localStorage.getItem('internal_token');
    if (!token) return;

    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/tickets/new-since?since=${encodeURIComponent(sinceRef.current)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) return;

      const data: { tickets: NewTicket[] } = await resp.json();
      const newTickets = data.tickets ?? [];
      if (newTickets.length === 0) return;

      // advance the cursor so we don't re-announce the same tickets
      sinceRef.current = newTickets[newTickets.length - 1].created_at;

      const seen = getSeenIds();
      const unseen = newTickets.filter((t) => !seen.has(t.id));
      if (unseen.length === 0) return;

      // mark as seen
      unseen.forEach((t) => seen.add(t.id));
      saveSeenIds(seen);

      // ── sound ──
      await playNotificationSound();

      // ── toast(s) ──
      unseen.forEach((ticket) => {
        const deptLabel =
          ticket.department === 'administrativo' ? 'Administrativo' : 'TI';
        toast(
          (t) => (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = `/admin/chamados/${ticket.id}`;
              }}
            >
              <strong style={{ fontSize: '0.95rem' }}>🔔 Novo chamado recebido</strong>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{ticket.title}</span>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Dept: {deptLabel} · clique para abrir</span>
            </div>
          ),
          {
            duration: 8000,
            position: 'top-right',
            style: {
              background: '#1a365d',
              color: '#fff',
              borderLeft: '4px solid #4299e1',
              borderRadius: '8px',
              padding: '12px 16px',
              maxWidth: '340px',
            },
          }
        );

        // ── browser notification ──
        sendBrowserNotification('Novo chamado recebido', ticket.title);
      });

      // ── badge counter ──
      setUnseenCount((prev) => prev + unseen.length);
    } catch (_) {
      // network error — silent fail, will retry
    }
  }, []);

  useEffect(() => {
    // Request browser notification permission on mount (non-blocking)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Unlock AudioContext as soon as the user first interacts with the page.
    document.addEventListener('click', unlockAudioCtx);
    document.addEventListener('keydown', unlockAudioCtx);

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await poll();
        schedule();
      }, POLL_MS);
    };

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('click', unlockAudioCtx);
      document.removeEventListener('keydown', unlockAudioCtx);
    };
  }, [poll]);

  return (
    <NotificationContext.Provider value={{ unseenCount, clearUnseen }}>
      {children}
    </NotificationContext.Provider>
  );
}
