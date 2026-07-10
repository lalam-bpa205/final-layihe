import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  Avatar,
  Badge,
  Button,
  Tabs,
  EmptyState,
  ConfirmDialog,
  EmployeeStatusBadge,
  EMPLOYEE_STATUS,
} from '../../components/ui';

const ATT_STATUS = {
  1: { text: 'İşdə', tone: 'green' },
  2: { text: 'Gecikib', tone: 'yellow' },
  3: { text: 'Yoxdur', tone: 'red' },
  4: { text: 'Məzuniyyət', tone: 'blue' },
};

const LEAVE_TYPES = { 1: 'İllik', 2: 'Xəstəlik', 3: 'Ödənişsiz', 4: 'Analıq', 5: 'Digər' };
const LEAVE_STATUS = {
  1: { text: 'Gözləyir', tone: 'yellow' },
  2: { text: 'Təsdiqlənib', tone: 'green' },
  3: { text: 'Rədd edilib', tone: 'red' },
  4: { text: 'Ləğv edilib', tone: 'slate' },
};

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    green: 'text-emerald-600 bg-emerald-50',
    yellow: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone] ?? 'text-slate-600 bg-slate-50'}`}>
      <p className="text-xl font-bold tracking-tight">{value ?? 0}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

// Məzuniyyət balansı üçün proqres halqası
function BalanceRing({ used, total }) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, used / safeTotal);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="url(#hrBalanceGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="hrBalanceGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tracking-tight text-slate-900">
          {used}/{total}
        </span>
        <span className="text-[11px] text-slate-500">gün istifadə</span>
      </div>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('general');
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/employees/${id}/profile`)
      .then(({ data }) => setProfile(data))
      .catch((err) => setError(err.response?.data?.message ?? 'Profil yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      await api.post(`/employees/${id}/status`, statusTarget, {
        headers: { 'Content-Type': 'application/json' },
      });
      notify.success('İşçinin statusu yeniləndi.');
      setStatusTarget(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Status dəyişdirilə bilmədi.');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-44 rounded-2xl bg-slate-200/70" />
        <div className="h-72 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !profile?.employee) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <EmptyState
          icon="🔍"
          title="İşçi tapılmadı"
          description={error ?? 'Bu identifikatorla işçi mövcud deyil.'}
          action={
            <Link to="/hr/employees">
              <Button variant="secondary">← İşçilər siyahısına qayıt</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const emp = profile.employee;
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const att = profile.attendanceSummary ?? {};
  const balance = profile.leaveBalance ?? {};
  const recentLeaves = profile.recentLeaves ?? [];
  const recentAttendance = profile.recentAttendance ?? [];
  const currentStatus = emp.status ?? 1;

  return (
    <div>
      <Link
        to="/hr/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        ← İşçilər siyahısı
      </Link>

      {/* Profil kartı */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm mb-6">
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-blue-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <Avatar name={fullName} size="xl" className="ring-4 ring-white shadow-md" />
              <div className="pb-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">{fullName}</h2>
                  <EmployeeStatusBadge status={currentStatus} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {emp.positionTitle} • {emp.departmentName}
                </p>
              </div>
            </div>

            {/* Status dəyişmə */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {Object.entries(EMPLOYEE_STATUS).map(([value, s]) => {
                const v = Number(value);
                const active = v === currentStatus;
                return (
                  <button
                    key={value}
                    onClick={() => !active && setStatusTarget(v)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-5">
            <InfoItem label="Email" value={emp.email} />
            <InfoItem label="Telefon" value={emp.phone} />
            <InfoItem label="İşə qəbul" value={emp.hireDate} />
            <InfoItem
              label="Maaş"
              value={emp.salary != null ? `${Number(emp.salary).toLocaleString('az-AZ')} ₼` : null}
            />
          </div>
        </div>
      </div>

      {/* Tab-lar */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="px-5 pt-2">
          <Tabs
            tabs={[
              { key: 'general', label: 'Ümumi', icon: '📋' },
              { key: 'attendance', label: 'Davamiyyət', icon: '🕘' },
              { key: 'leave', label: 'Məzuniyyət', icon: '🌴' },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        <div className="p-6">
          {tab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <InfoItem label="Ad" value={emp.firstName} />
                <InfoItem label="Soyad" value={emp.lastName} />
                <InfoItem label="Doğum tarixi" value={emp.birthDate} />
                <InfoItem label="Şöbə" value={emp.departmentName} />
                <InfoItem label="Vəzifə" value={emp.positionTitle} />
                <InfoItem label="Ünvan" value={emp.address} />
                <InfoItem label="Təcili əlaqə" value={emp.emergencyContact} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Qeydlər
                </p>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {emp.notes || 'Qeyd yoxdur.'}
                </div>
              </div>
            </div>
          )}

          {tab === 'attendance' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MiniStat label="İşdə olduğu günlər" value={att.presentDays} tone="green" />
                <MiniStat label="Gecikmələr" value={att.lateDays} tone="yellow" />
                <MiniStat label="Buraxılan günlər" value={att.absentDays} tone="red" />
                <MiniStat label="Məzuniyyət günləri" value={att.onLeaveDays} tone="blue" />
              </div>

              {recentAttendance.length === 0 ? (
                <EmptyState
                  icon="🕘"
                  title="Qeyd yoxdur"
                  description="Bu işçi üçün hələ davamiyyət qeydi yoxdur."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentAttendance.map((r, i) => {
                    const st = ATT_STATUS[r.status] ?? { text: r.status, tone: 'slate' };
                    return (
                      <li key={i} className="flex items-center justify-between gap-4 py-3">
                        <span className="text-sm font-medium text-slate-700 tabular-nums">
                          {r.date}
                        </span>
                        <span className="text-sm text-slate-500 tabular-nums">
                          {r.checkIn?.slice(0, 5) ?? '—'} → {r.checkOut?.slice(0, 5) ?? '—'}
                        </span>
                        <Badge tone={st.tone}>{st.text}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'leave' && (
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
              <div className="flex flex-col items-center gap-3">
                <BalanceRing used={balance.usedDays ?? 0} total={balance.totalDays ?? 21} />
                <p className="text-sm text-slate-500">
                  Qalıq:{' '}
                  <span className="font-semibold text-slate-800">
                    {balance.remainingDays ?? 0} gün
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Son məzuniyyətlər
                </p>
                {recentLeaves.length === 0 ? (
                  <EmptyState
                    icon="🌴"
                    title="Məzuniyyət yoxdur"
                    description="Bu işçinin hələ məzuniyyət sorğusu olmayıb."
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentLeaves.map((l, i) => {
                      const st = LEAVE_STATUS[l.status] ?? { text: l.status, tone: 'slate' };
                      return (
                        <li key={i} className="flex items-center justify-between gap-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {LEAVE_TYPES[l.type] ?? l.type}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {l.startDate} → {l.endDate}
                            </p>
                          </div>
                          <Badge tone={st.tone}>{st.text}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={statusTarget != null}
        danger={statusTarget === 3}
        title="Statusu dəyiş"
        message={
          statusTarget != null
            ? `${fullName} işçisinin statusu "${EMPLOYEE_STATUS[statusTarget]?.label}" olaraq dəyişdirilsin?`
            : ''
        }
        confirmText="Dəyişdir"
        loading={statusLoading}
        onConfirm={changeStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
