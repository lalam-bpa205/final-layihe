import { Badge } from '../../components/ui';

// Satış sifarişi statusları — backend SalesOrderStatus enum-u ilə uyğun.
export const SO_STATUS = {
  1: { text: 'Gözləyir', tone: 'yellow' },
  2: { text: 'Təsdiqlənib', tone: 'green' },
  3: { text: 'Ləğv edilib', tone: 'slate' },
};

// Alış sifarişi statusları — backend PurchaseOrderStatus enum-u ilə uyğun.
export const PO_STATUS = {
  1: { text: 'Gözləyir', tone: 'yellow' },
  2: { text: 'Qəbul edilib', tone: 'green' },
  3: { text: 'Ləğv edilib', tone: 'slate' },
};

export function SalesOrderStatusBadge({ status }) {
  const s = SO_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

export function PurchaseOrderStatusBadge({ status }) {
  const s = PO_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

// Qrafik rəngləri — dataviz validatorundan keçib (light surface).
export const SALES_BLUE = '#2a78d6';
export const PURCHASE_ORANGE = '#eb6834';

export const fmtMoney = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼`;

export const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d ?? '—';
  return date.toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// "yyyy-MM" → "İyl 26" kimi qısa ay adı.
// QEYD: toLocaleDateString az-AZ lokalında Chromium "M02" kimi çıxardığı üçün əl ilə massiv.
const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

export const fmtMonth = (m) => {
  if (!m) return '—';
  const [y, mo] = String(m).split('-').map(Number);
  if (!y || !mo) return m;
  return `${MONTH_SHORT[mo - 1]} ${String(y).slice(2)}`;
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
