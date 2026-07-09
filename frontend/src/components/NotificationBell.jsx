import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import api from '../api/axios';

const HUB_URL = 'http://localhost:5042/hubs/notifications';
const LAST_SEEN_KEY = 'notif_last_seen_id';

const timeAgo = (dateStr) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'indicə';
  if (mins < 60) return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  return `${Math.floor(hours / 24)} gün əvvəl`;
};

export default function NotificationBell({ dark = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0));
  const connectionRef = useRef(null);

  // İlkin siyahı + SignalR bağlantısı
  useEffect(() => {
    api.get('/notifications').then(({ data }) => setItems(data)).catch(() => {});

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('accessToken') ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    connection.on('notification', (n) => {
      setItems((prev) => [n, ...prev].slice(0, 20));
      setToast(n);
      setTimeout(() => setToast((t) => (t?.id === n.id ? null : t)), 6000);
    });

    connection.start().catch(() => {});
    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, []);

  const unreadCount = items.filter((n) => n.id > lastSeen).length;

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && items.length > 0) {
      const maxId = Math.max(...items.map((n) => n.id));
      setLastSeen(maxId);
      localStorage.setItem(LAST_SEEN_KEY, String(maxId));
    }
  };

  const go = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className={`relative rounded-lg p-2 text-xl leading-none ${
          dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
        }`}
        aria-label="Bildirişlər"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-w-[90vw] z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">
              Bildirişlər
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-400">Bildiriş yoxdur.</p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdDate)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 cursor-pointer border border-slate-700"
          onClick={() => { setToast(null); if (toast.link) navigate(toast.link); }}
        >
          <p className="font-semibold text-sm">{toast.title}</p>
          <p className="text-sm text-slate-300 mt-0.5">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
