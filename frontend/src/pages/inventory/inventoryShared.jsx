import { Badge } from '../../components/ui';

// Stok hərəkəti növləri — backend StockMovementType enum-u ilə uyğun.
export const MOVEMENT_TYPES = {
  1: { text: 'Giriş', tone: 'green', sign: '+' },
  2: { text: 'Çıxış', tone: 'red', sign: '−' },
  3: { text: 'Transfer (qəbul)', tone: 'blue', sign: '+' },
  4: { text: 'Transfer (göndərmə)', tone: 'yellow', sign: '−' },
};

export function MovementTypeBadge({ type }) {
  const t = MOVEMENT_TYPES[type] ?? { text: String(type), tone: 'slate' };
  return <Badge tone={t.tone}>{t.text}</Badge>;
}

// Miqdarı hərəkət növünə görə işarəli və rəngli göstərir.
export function SignedQty({ type, quantity, unit }) {
  const t = MOVEMENT_TYPES[type];
  const positive = t?.sign === '+';
  return (
    <span
      className={`font-semibold tabular-nums ${
        positive ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      {t?.sign ?? ''}
      {quantity}
      {unit ? ` ${unit}` : ''}
    </span>
  );
}

export const fmtMoney = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼`;

export const fmtDateTime = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d ?? '—';
  return date.toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// İcmal və detal səhifələrində istifadə olunan başlıqlı kart.
export function Card({ title, icon, action, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
