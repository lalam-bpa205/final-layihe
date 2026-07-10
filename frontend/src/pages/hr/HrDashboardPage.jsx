import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageHeader, StatCard, Avatar, EmptyState } from '../../components/ui';

const ATTENDANCE_ITEMS = [
  { key: 'present', label: 'İşdə', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  { key: 'late', label: 'Gecikib', dot: 'bg-amber-500', text: 'text-amber-600' },
  { key: 'absent', label: 'Yoxdur', dot: 'bg-red-500', text: 'text-red-600' },
  { key: 'onLeave', label: 'Məzuniyyət', dot: 'bg-blue-500', text: 'text-blue-600' },
];

function formatBirthday(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' });
}

function Card({ title, icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span aria-hidden="true">{icon}</span>
        <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function HrDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/hr/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(err.response?.data?.message ?? 'İcmal məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  const att = summary?.attendanceToday ?? {};
  const attTotal = ATTENDANCE_ITEMS.reduce((s, i) => s + (att[i.key] ?? 0), 0);
  const departments = summary?.departmentDistribution ?? [];
  const maxDept = Math.max(1, ...departments.map((d) => d.count));
  const birthdays = summary?.birthdaysThisMonth ?? [];

  return (
    <div>
      <PageHeader
        title="İnsan Resursları — İcmal"
        description="Komandanın bugünkü mənzərəsi: davamiyyət, məzuniyyətlər və şöbələr"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Əsas göstəricilər */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="👥"
          accent="indigo"
          value={summary?.headcount ?? 0}
          label="Ümumi işçi sayı"
          sub="Aktiv heyət"
        />
        <StatCard
          loading={loading}
          icon="✨"
          accent="emerald"
          value={summary?.newHiresThisMonth ?? 0}
          label="Bu ay yeni işçi"
          sub="Son 30 gün ərzində qoşulanlar"
        />
        <StatCard
          loading={loading}
          icon="🌴"
          accent="sky"
          value={summary?.onLeaveToday ?? 0}
          label="Bu gün məzuniyyətdə"
          sub="Təsdiqlənmiş məzuniyyətlər"
        />
        <StatCard
          loading={loading}
          icon="⏳"
          accent="amber"
          value={summary?.pendingLeaveCount ?? 0}
          label="Gözləyən sorğu"
          sub={
            <Link to="/hr/leave-requests" className="text-indigo-600 hover:underline">
              Sorğulara bax →
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Bugünkü davamiyyət */}
        <Card title="Bugünkü davamiyyət" icon="🕘">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {ATTENDANCE_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                      <span className="text-xs font-medium text-slate-500">{item.label}</span>
                    </div>
                    <p className={`mt-1 text-xl font-bold tracking-tight ${item.text}`}>
                      {att[item.key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Cəmi {attTotal} qeyd •{' '}
                <Link to="/hr/attendance" className="text-indigo-600 hover:underline">
                  Davamiyyətə bax →
                </Link>
              </p>
            </>
          )}
        </Card>

        {/* Şöbə paylanması */}
        <Card title="Şöbələr üzrə paylanma" icon="🏢">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-slate-100" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <EmptyState icon="🏢" title="Şöbə yoxdur" description="Hələ heç bir şöbə yaradılmayıb." />
          ) : (
            <ul className="space-y-3.5">
              {departments.map((d) => (
                <li key={d.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{d.name}</span>
                    <span className="text-slate-500 tabular-nums">{d.count} nəfər</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${(d.count / maxDept) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Bu ayın ad günləri */}
        <Card title="Bu ayın ad günləri" icon="🎂">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="h-3.5 w-32 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : birthdays.length === 0 ? (
            <EmptyState
              icon="🎂"
              title="Ad günü yoxdur"
              description="Bu ay heç bir işçinin ad günü qeyd olunmayıb."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {birthdays.map((b) => (
                <li key={b.employeeId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar name={b.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/hr/employees/${b.employeeId}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {b.fullName}
                    </Link>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {formatBirthday(b.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
