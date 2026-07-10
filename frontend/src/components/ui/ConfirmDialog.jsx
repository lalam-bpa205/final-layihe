import { useEffect, useState } from 'react';
import Button from './Button';

// window.confirm əvəzinə təsdiq dialoqu.
export default function ConfirmDialog({
  open,
  title = 'Əminsiniz?',
  message,
  confirmText = 'Sil',
  cancelText = 'İmtina',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (e) => e.key === 'Escape' && onCancel?.();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCancel}
      />
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            danger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {danger ? '🗑️' : '❓'}
        </div>
        <h3 className="text-center text-base font-semibold text-slate-900">{title}</h3>
        {message && <p className="mt-2 text-center text-sm text-slate-500">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
