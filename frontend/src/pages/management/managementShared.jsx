// Management modulunun ortaq köməkçiləri — StatisticsPage və AuditLogsPage istifadə edir.

// Audit əməliyyatları — nişan mətni, rəngi və ikonu.
export const ACTION_LABELS = {
  Created: { text: 'Yaradıldı', cls: 'bg-green-100 text-green-700', icon: '➕' },
  Updated: { text: 'Yeniləndi', cls: 'bg-blue-100 text-blue-700', icon: '✏️' },
  Deleted: { text: 'Silindi', cls: 'bg-red-100 text-red-700', icon: '🗑️' },
};

export const actionLabel = (a) =>
  ACTION_LABELS[a] ?? { text: a ?? '—', cls: 'bg-slate-100 text-slate-600', icon: '•' };

// Entity adlarının Azərbaycanca qarşılığı.
export const ENTITY_LABELS = {
  User: 'İstifadəçi', Role: 'Rol', UserRole: 'İstifadəçi rolu', UserModuleAccess: 'Modul icazəsi',
  Department: 'Şöbə', Position: 'Vəzifə', Employee: 'İşçi', Attendance: 'Davamiyyət', LeaveRequest: 'Məzuniyyət sorğusu',
  Category: 'Kateqoriya', Warehouse: 'Anbar', Product: 'Məhsul', StockMovement: 'Stok hərəkəti',
  Vehicle: 'Avtomobil', Driver: 'Sürücü', Delivery: 'Çatdırılma', FuelRecord: 'Yanacaq qeydi', MaintenanceRecord: 'Təmir qeydi',
  TransactionCategory: 'Maliyyə kateqoriyası', FinanceTransaction: 'Maliyyə əməliyyatı', Budget: 'Büdcə',
  Invoice: 'Faktura', InvoiceItem: 'Faktura sətri', Payment: 'Ödəniş',
  Customer: 'Müştəri', Supplier: 'Təchizatçı',
  SalesOrder: 'Satış sifarişi', SalesOrderItem: 'Satış sifarişi sətri',
  PurchaseOrder: 'Alış sifarişi', PurchaseOrderItem: 'Alış sifarişi sətri',
};

export const entityLabel = (e) => ENTITY_LABELS[e] ?? e;

// Modul adlarının Azərbaycanca qarşılığı (modulesActivity üçün).
export const MODULE_LABELS = {
  Hr: 'Kadrlar', HR: 'Kadrlar', Inventory: 'Anbar', Transport: 'Nəqliyyat',
  Finance: 'Maliyyə', Sales: 'Satış', Management: 'İdarəetmə', Reports: 'Hesabatlar',
};

export const moduleLabel = (m) => MODULE_LABELS[m] ?? m;

export const fmtMoney = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼`;

export const fmtNumber = (v) => Number(v ?? 0).toLocaleString('az-AZ');

// "yyyy-MM" → "İyl 26".
// QEYD: toLocaleDateString az-AZ lokalında Chromium ayı "M02" kimi verdiyi üçün əl ilə massiv.
const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

export const fmtMonth = (m) => {
  if (!m) return '—';
  const [y, mo] = String(m).split('-').map(Number);
  if (!y || !mo) return String(m);
  return `${MONTH_SHORT[mo - 1]} ${String(y).slice(2)}`;
};

// UTC timestamp → nisbi vaxt ("5 dəq əvvəl").
export const timeAgo = (utc) => {
  if (!utc) return '—';
  const s = String(utc);
  const date = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
  if (Number.isNaN(date.getTime())) return '—';

  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'İndicə';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dəq əvvəl`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat əvvəl`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} gün əvvəl`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} ay əvvəl`;
  return `${Math.floor(month / 12)} il əvvəl`;
};

// Başlıqlı kart — modulun bütün bloklarında istifadə olunur.
export function Card({ title, icon, action, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          {icon && <span aria-hidden="true">{icon}</span>}
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
