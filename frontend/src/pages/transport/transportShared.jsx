import { Badge } from '../../components/ui';

// Çatdırılma statusları — backend DeliveryStatus enum-u ilə uyğun.
export const DELIVERY_STATUS = {
  1: { text: 'Planlaşdırılıb', tone: 'slate' },
  2: { text: 'Yolda', tone: 'blue' },
  3: { text: 'Çatdırılıb', tone: 'green' },
  4: { text: 'Ləğv edilib', tone: 'red' },
};

// Avtomobil statusları — backend VehicleStatus enum-u ilə uyğun.
export const VEHICLE_STATUS = {
  1: { text: 'Aktiv', tone: 'green' },
  2: { text: 'Səfərdə', tone: 'blue' },
  3: { text: 'Təmirdə', tone: 'yellow' },
  4: { text: 'Deaktiv', tone: 'slate' },
};

// Sürücü statusları — backend DriverStatus enum-u ilə uyğun.
export const DRIVER_STATUS = {
  1: { text: 'Hazırdır', tone: 'green' },
  2: { text: 'Səfərdə', tone: 'blue' },
  3: { text: 'Deaktiv', tone: 'slate' },
};

// Avtomobil növləri — backend VehicleType enum-u ilə uyğun.
export const VEHICLE_TYPES = {
  1: 'Yük maşını',
  2: 'Furqon',
  3: 'Minik',
  4: 'Qoşqu',
};

export function DeliveryStatusBadge({ status }) {
  const s = DELIVERY_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

export function VehicleStatusBadge({ status }) {
  const s = VEHICLE_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

export function DriverStatusBadge({ status }) {
  const s = DRIVER_STATUS[status] ?? { text: String(status), tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

// Çatdırılma əməliyyatları — ConfirmDialog mətnləri ilə birlikdə.
export const DELIVERY_ACTIONS = {
  start: {
    title: 'Çatdırılmanı yola sal',
    message: (d) => `${d.number} yola salınsın? Avtomobil və sürücü "Səfərdə" statusuna keçəcək.`,
    confirmText: 'Yola sal',
    danger: false,
    success: 'Çatdırılma yola salındı.',
  },
  complete: {
    title: 'Çatdırılmanı tamamla',
    message: (d) => `${d.number} çatdırılmış kimi qeyd edilsin?`,
    confirmText: 'Tamamla',
    danger: false,
    success: 'Çatdırılma tamamlandı.',
  },
  cancel: {
    title: 'Çatdırılmanı ləğv et',
    message: (d) => `${d.number} ləğv edilsin? Bu əməliyyat geri qaytarıla bilməz.`,
    confirmText: 'Ləğv et',
    danger: true,
    success: 'Çatdırılma ləğv edildi.',
  },
};

export const fmtMoney = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼`;

export const fmtDateTime = (d) => {
  if (!d) return '—';
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
