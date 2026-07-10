const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
};

const DOTS = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  indigo: 'bg-indigo-500',
};

export default function Badge({ tone = 'slate', dot = true, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] ?? TONES.slate} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone] ?? DOTS.slate}`} />}
      {children}
    </span>
  );
}

// İşçi statusu (1=Aktiv, 2=Məzuniyyətdə, 3=İşdən çıxıb) üçün hazır badge
export const EMPLOYEE_STATUS = {
  1: { label: 'Aktiv', tone: 'green' },
  2: { label: 'Məzuniyyətdə', tone: 'blue' },
  3: { label: 'İşdən çıxıb', tone: 'slate' },
};

export function EmployeeStatusBadge({ status }) {
  const s = EMPLOYEE_STATUS[status] ?? EMPLOYEE_STATUS[1];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
