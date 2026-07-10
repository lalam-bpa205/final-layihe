import { useEffect, useState } from 'react';

const STYLES = {
  error: { bar: 'bg-red-500', icon: '⛔', title: 'Xəta' },
  success: { bar: 'bg-emerald-500', icon: '✅', title: 'Uğurlu' },
  info: { bar: 'bg-blue-500', icon: 'ℹ️', title: 'Məlumat' },
};

let nextId = 1;

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    window.addEventListener('app-toast', onToast);
    return () => window.removeEventListener('app-toast', onToast);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-96 max-w-[90vw]">
      {toasts.map((t) => {
        const s = STYLES[t.type] ?? STYLES.info;
        return (
          <div
            key={t.id}
            className="flex bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-[slideIn_.25s_ease-out]"
          >
            <div className={`w-1.5 shrink-0 ${s.bar}`} />
            <div className="flex items-start gap-3 px-4 py-3 flex-1">
              <span className="text-lg leading-none mt-0.5">{s.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                <p className="text-sm text-slate-600">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 leading-none"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  );
}
