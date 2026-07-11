import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { notify } from '../../notify';
import { Button, ConfirmDialog, EmptyState } from '../../components/ui';
import {
  Card,
  DeliveryStatusBadge,
  VehicleStatusBadge,
  VEHICLE_TYPES,
  fmtMoney,
  fmtDate,
  fmtMonth,
} from './transportShared';

// dataviz palitrası (light surface üçün validasiya olunmuş)
const FUEL_BLUE = '#2a78d6';
const MAINT_ORANGE = '#eb6834';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs text-slate-500">{fmtMonth(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-800 tabular-nums">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
            aria-hidden="true"
          />
          {p.name}: <span className="font-semibold">{fmtMoney(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function InfoItem({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  const tones = {
    blue: 'text-blue-700 bg-blue-50',
    orange: 'text-orange-700 bg-orange-50',
    green: 'text-emerald-700 bg-emerald-50',
    slate: 'text-slate-600 bg-slate-50',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone] ?? tones.slate}`}>
      <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] opacity-70 tabular-nums">{sub}</p>}
    </div>
  );
}

const STATUS_CONFIRM = {
  3: {
    title: 'Təmirə göndər',
    message: (v) => `${v.plateNumber} təmirə göndərilsin? Status "Təmirdə" olacaq.`,
    confirmText: 'Təmirə göndər',
  },
  1: {
    title: 'Təmirdən qaytar',
    message: (v) => `${v.plateNumber} təmirdən qaytarılsın? Status "Aktiv" olacaq.`,
    confirmText: 'Qaytar',
  },
};

export default function VehicleDetailPage() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); // 1 | 3
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/vehicles/${id}/details`)
      .then(({ data }) => setDetails(data))
      .catch((err) => setError(err.response?.data?.message ?? 'Avtomobil məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmStatus = async () => {
    if (!pendingStatus) return;
    setStatusLoading(true);
    try {
      await api.post(`/vehicles/${id}/status`, pendingStatus, {
        headers: { 'Content-Type': 'application/json' },
      });
      notify.success('Avtomobilin statusu yeniləndi.');
      setPendingStatus(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-44 rounded bg-slate-200" />
        <div className="h-44 rounded-2xl bg-slate-200/70" />
        <div className="h-80 rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-56 rounded-2xl bg-slate-100" />
          <div className="h-56 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !details?.vehicle) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <EmptyState
          icon="🔍"
          title="Avtomobil tapılmadı"
          description={error ?? 'Bu identifikatorla avtomobil mövcud deyil.'}
          action={
            <Link to="/transport/vehicles">
              <Button variant="secondary">← Avtomobillər siyahısına qayıt</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const v = details.vehicle;
  const totals = details.totals ?? {};
  const monthlyCosts = details.monthlyCosts ?? [];
  const fuelRecords = details.recentFuelRecords ?? [];
  const maintenance = details.recentMaintenance ?? [];
  const deliveries = details.recentDeliveries ?? [];
  const statusAction = pendingStatus ? STATUS_CONFIRM[pendingStatus] : null;

  return (
    <div>
      <Link
        to="/transport/vehicles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        ← Avtomobillər siyahısı
      </Link>

      {/* Başlıq kartı */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm mb-6">
        <div className="h-2 bg-gradient-to-r from-indigo-600 to-blue-600" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                  {v.plateNumber}
                </h2>
                <VehicleStatusBadge status={v.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {v.brand} {v.model} • {v.year} • {VEHICLE_TYPES[v.type] ?? v.type}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {v.status === 1 && (
                <Button
                  variant="secondary"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                  onClick={() => setPendingStatus(3)}
                >
                  🔧 Təmirə göndər
                </Button>
              )}
              {v.status === 3 && (
                <Button onClick={() => setPendingStatus(1)}>✅ Təmirdən qaytar</Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-5">
            <InfoItem label="Marka / Model" value={`${v.brand} ${v.model}`} />
            <InfoItem label="Buraxılış ili" value={v.year} />
            <InfoItem label="Növ" value={VEHICLE_TYPES[v.type] ?? v.type} />
            <InfoItem
              label="Yük tutumu"
              value={`${Number(v.capacityKg ?? 0).toLocaleString('az-AZ')} kq`}
            />
          </div>
        </div>
      </div>

      {/* Ümumi göstəricilər */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <MiniStat
          label="Ümumi yanacaq xərci"
          value={fmtMoney(totals.fuelCost)}
          sub={`${Number(totals.fuelLiters ?? 0).toLocaleString('az-AZ')} litr`}
          tone="blue"
        />
        <MiniStat label="Ümumi təmir xərci" value={fmtMoney(totals.maintenanceCost)} tone="orange" />
        <MiniStat
          label="Çatdırılma sayı"
          value={totals.deliveryCount ?? 0}
          sub={`${totals.deliveredCount ?? 0} tamamlanıb`}
          tone="green"
        />
        <MiniStat
          label="Aylıq orta xərc (6 ay)"
          value={fmtMoney(
            monthlyCosts.length
              ? monthlyCosts.reduce((s, m) => s + (m.fuelCost ?? 0) + (m.maintenanceCost ?? 0), 0) /
                  monthlyCosts.length
              : 0
          )}
          tone="slate"
        />
      </div>

      {/* Xərclər qrafiki */}
      <Card title="Xərclər (son 6 ay)" icon="📊" className="mb-4">
        {monthlyCosts.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Xərc qeydi yoxdur"
            description="Bu avtomobil üzrə son 6 ayda yanacaq və ya təmir xərci qeydə alınmayıb."
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyCosts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={fmtMonth}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(val) => Number(val).toLocaleString('az-AZ')}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-slate-600">{value}</span>
                )}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="fuelCost"
                name="Yanacaq"
                fill={FUEL_BLUE}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="maintenanceCost"
                name="Təmir"
                fill={MAINT_ORANGE}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Son yanacaq / təmir qeydləri */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <Card
          title="Son yanacaq qeydləri"
          icon="⛽"
          action={
            <Link to="/transport/logs" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {fuelRecords.length === 0 ? (
            <EmptyState
              icon="⛽"
              title="Qeyd yoxdur"
              description="Bu avtomobil üzrə yanacaq qeydi yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {fuelRecords.map((f) => (
                <li key={f.id} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 tabular-nums">
                      {Number(f.liters ?? 0).toLocaleString('az-AZ')} litr
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {fmtDate(f.date)}
                      {f.driverName ? ` • ${f.driverName}` : ''}
                      {f.odometerKm != null
                        ? ` • ${Number(f.odometerKm).toLocaleString('az-AZ')} km`
                        : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {fmtMoney(f.cost)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Son təmirlər"
          icon="🔧"
          action={
            <Link to="/transport/logs" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {maintenance.length === 0 ? (
            <EmptyState
              icon="🔧"
              title="Qeyd yoxdur"
              description="Bu avtomobil üzrə təmir qeydi yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {maintenance.map((m) => (
                <li key={m.id} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{m.description}</p>
                    <p className="text-xs text-slate-400">
                      {fmtDate(m.date)}
                      {m.nextDueDate ? ` • Növbəti baxış: ${fmtDate(m.nextDueDate)}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {fmtMoney(m.cost)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Son çatdırılmalar */}
      <Card title="Son çatdırılmalar" icon="🚚">
        {deliveries.length === 0 ? (
          <EmptyState
            icon="🚚"
            title="Çatdırılma yoxdur"
            description="Bu avtomobil hələ heç bir çatdırılmada iştirak etməyib."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {deliveries.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/transport/deliveries/${d.id}`}
                  className="group flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="font-mono group-hover:text-indigo-600 transition-colors">
                        {d.number}
                      </span>
                      <span className="text-slate-400"> • </span>
                      {d.customerName}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {d.fromAddress} → {d.toAddress} • {fmtDate(d.scheduledDate)}
                    </p>
                  </div>
                  <DeliveryStatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={statusAction?.title}
        message={statusAction ? statusAction.message(v) : ''}
        confirmText={statusAction?.confirmText}
        danger={false}
        loading={statusLoading}
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}
