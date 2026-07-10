import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  Select,
  Tabs,
  EmptyState,
  SkeletonRows,
} from '../../components/ui';

const STATUS_LABELS = {
  1: { text: 'İşdə', tone: 'green' },
  2: { text: 'Gecikib', tone: 'yellow' },
  3: { text: 'Yoxdur', tone: 'red' },
  4: { text: 'Məzuniyyət', tone: 'blue' },
};

const CELL_COLORS = {
  1: 'bg-emerald-500',
  2: 'bg-amber-400',
  3: 'bg-red-500',
  4: 'bg-blue-500',
};

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

// ---------------- Günlük görünüş ----------------
function DailyView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/attendance', { params: { date } })
      .then(({ data }) => setRecords(data))
      .catch(() => notify.error('Davamiyyət qeydləri yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/employees', { params: { pageSize: 100 } })
      .then(({ data }) => setEmployees(data.items));
  }, []);

  const act = async (path) => {
    if (!selectedEmployee) return;
    setActing(path);
    try {
      await api.post(`/attendance/${path}`, { employeeId: Number(selectedEmployee) });
      notify.success(path === 'check-in' ? 'Check-in qeyd olundu.' : 'Check-out qeyd olundu.');
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActing(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="date"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {date === today && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-56"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">İşçi seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => act('check-in')}
              disabled={!selectedEmployee}
              loading={acting === 'check-in'}
            >
              ✓ Check-in
            </Button>
            <Button
              variant="secondary"
              onClick={() => act('check-out')}
              disabled={!selectedEmployee}
              loading={acting === 'check-out'}
            >
              Check-out
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçi</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Gəliş</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Gediş</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qeyd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={5} withAvatar />
            ) : (
              records.map((r) => {
                const status = STATUS_LABELS[r.status] ?? { text: r.status, tone: 'slate' };
                return (
                  <tr key={r.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.employeeName} size="sm" />
                        <span className="font-medium text-slate-800">{r.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 tabular-nums">{r.checkIn?.slice(0, 5) ?? '—'}</td>
                    <td className="px-6 py-3.5 tabular-nums">{r.checkOut?.slice(0, 5) ?? '—'}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{r.note || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && records.length === 0 && (
          <EmptyState
            icon="🕘"
            title="Qeyd yoxdur"
            description="Bu tarix üçün davamiyyət qeydi tapılmadı."
          />
        )}
      </div>
    </div>
  );
}

// ---------------- Aylıq görünüş ----------------
function MonthlyView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState({ employees: [], records: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data));
  }, []);

  useEffect(() => {
    const params = { year, month };
    if (departmentId) params.departmentId = departmentId;
    setLoading(true);
    api
      .get('/attendance/monthly', { params })
      .then(({ data }) => setData(data))
      .catch(() => notify.error('Aylıq davamiyyət yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [year, month, departmentId]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // employeeId-günə görə qeyd xəritəsi
  const recordMap = {};
  for (const r of data.records ?? []) {
    const day = Number(String(r.date).slice(8, 10));
    recordMap[`${r.employeeId}-${day}`] = r;
  }

  const isWeekend = (day) => {
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 3 + i);
  const employees = data.employees ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select className="w-36" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </Select>
        <Select className="w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select
          className="w-52"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Bütün şöbələr</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        {/* Legend */}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {Object.entries(STATUS_LABELS).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${CELL_COLORS[k]}`} />
              {s.text}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-slate-100" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Məlumat yoxdur"
            description="Seçilmiş ay və filtr üçün davamiyyət məlumatı tapılmadı."
          />
        ) : (
          <table className="text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50/95 text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 min-w-48">
                  İşçi
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`px-1 py-2.5 text-center text-[11px] font-semibold border-b border-slate-200 min-w-7 ${
                      isWeekend(d) ? 'text-rose-500 bg-rose-50/60' : 'text-slate-500 bg-slate-50/80'
                    }`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.employeeId} className="group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50/60 px-4 py-2 border-b border-slate-100 whitespace-nowrap transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.employeeName} size="sm" />
                      <span className="font-medium text-slate-800">{emp.employeeName}</span>
                    </div>
                  </td>
                  {days.map((d) => {
                    const rec = recordMap[`${emp.employeeId}-${d}`];
                    const st = rec ? STATUS_LABELS[rec.status] : null;
                    const tooltip = rec
                      ? `${rec.date} • ${st?.text ?? rec.status}${
                          rec.checkIn ? ` • ${rec.checkIn.slice(0, 5)}` : ''
                        }${rec.checkOut ? ` → ${rec.checkOut.slice(0, 5)}` : ''}`
                      : `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')} • Qeyd yoxdur`;
                    return (
                      <td
                        key={d}
                        title={tooltip}
                        className={`px-1 py-2 text-center border-b border-slate-100 ${
                          isWeekend(d) ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <span
                          className={`mx-auto block h-4 w-4 rounded ${
                            rec ? CELL_COLORS[rec.status] ?? 'bg-slate-300' : 'bg-slate-100'
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [tab, setTab] = useState('daily');

  return (
    <div>
      <PageHeader
        title="Davamiyyət"
        description="İşçilərin gündəlik giriş-çıxış qeydləri və aylıq icmal"
      />

      <Tabs
        className="mb-5"
        tabs={[
          { key: 'daily', label: 'Günlük', icon: '📆' },
          { key: 'monthly', label: 'Aylıq', icon: '🗓️' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'daily' ? <DailyView /> : <MonthlyView />}
    </div>
  );
}
