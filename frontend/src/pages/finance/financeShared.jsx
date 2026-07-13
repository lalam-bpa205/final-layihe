import { Badge } from '../../components/ui';

// Faktura statusları — backend InvoiceStatus enum-u ilə uyğun.
export const INVOICE_STATUS = {
  1: { text: 'Ödənilməyib', tone: 'red' },
  2: { text: 'Qismən ödənilib', tone: 'yellow' },
  3: { text: 'Ödənilib', tone: 'green' },
  4: { text: 'Ləğv edilib', tone: 'slate' },
};

// Əməliyyat tipləri — backend TransactionType enum-u ilə uyğun.
export const TX_TYPE = {
  1: { text: 'Gəlir', tone: 'green' },
  2: { text: 'Xərc', tone: 'red' },
};

// Ödəniş üsulları — backend PaymentMethod enum-u ilə uyğun.
export const PAYMENT_METHODS = {
  1: 'Nağd',
  2: 'Kart',
  3: 'Bank köçürməsi',
};

export function InvoiceStatusBadge({ status }) {
  const s = INVOICE_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

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
