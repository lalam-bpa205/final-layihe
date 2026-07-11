import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageHeader, StatCard, EmptyState, Avatar, Badge } from '../../components/ui';
import { Card, DeliveryStatusBadge, fmtMoney, fmtDate } from './transportShared';

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="h-3.5 w-40 rounded bg-slate-200" />
          <div className="h-3.5 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// Status bölgüsü sətri — rəngli nöqtə + ad + say + nisbət zolağı.
function StatusRow({ dotCls, barCls, label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <span className={`h-2 w-2 rounded-full ${dotCls}`} aria-hidden="true" />
          {label}
        </span>
        <span className="tabular-nums font-semibold text-slate-800">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${barCls} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function TransportDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/transport/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(err.response?.data?.message ?? 'İcmal məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  const vehicles = summary?.vehicles ?? {};
  const drivers = summary?.drivers ?? {};
  const month = summary?.deliveriesThisMonth ?? {};
  const expiring = summary?.expiringLicenses ?? [];
  const topDrivers = summary?.topDrivers ?? [];
  const recentDeliveries = summary?.recentDeliveries ?? [];

  return (
    <div>
      <PageHeader
        title="Nəqliyyat — İcmal"
        description="Avtomobil parkı, sürücülər, çatdırılmalar və xərclərin ümumi mənzərəsi"
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
          icon="🚚"
          accent="sky"
          value={summary?.activeDeliveryCount ?? 0}
          label="Yolda olan çatdırılma"
          sub={
            <Link to="/transport/deliveries" className="text-indigo-600 hover:underline">
              Çatdırılmalara bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="✅"
          accent="emerald"
          value={month.delivered ?? 0}
          label="Bu ay tamamlanan"
          sub={`Cəmi ${month.total ?? 0} çatdırılma • ${month.cancelled ?? 0} ləğv`}
        />
        <StatCard
          loading={loading}
          icon="⛽"
          accent="indigo"
          value={fmtMoney(summary?.monthFuelCost)}
          label="Bu ay yanacaq xərci"
          sub={
            <Link to="/transport/logs" className="text-indigo-600 hover:underline">
              Qeydlərə bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="🔧"
          accent="amber"
          value={fmtMoney(summary?.monthMaintenanceCost)}
          label="Bu ay təmir xərci"
          sub={
            (vehicles.inMaintenance ?? 0) > 0 ? (
              <span className="text-amber-600 font-medium">
                {vehicles.inMaintenance} avtomobil təmirdədir
              </span>
            ) : (
              'Təmirdə avtomobil yoxdur'
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Avtomobil parkı */}
        <Card
          title="Avtomobil parkı"
          icon="🚛"
          action={
            <Link to="/transport/vehicles" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : (vehicles.total ?? 0) === 0 ? (
            <EmptyState
              icon="🚛"
              title="Avtomobil yoxdur"
              description="Hələ parka avtomobil əlavə olunmayıb."
            />
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                Cəmi {vehicles.total} avtomobil
              </p>
              <ul>
                <StatusRow
                  dotCls="bg-emerald-500"
                  barCls="bg-emerald-500"
                  label="Aktiv"
                  count={vehicles.active ?? 0}
                  total={vehicles.total ?? 0}
                />
                <StatusRow
                  dotCls="bg-blue-500"
                  barCls="bg-blue-500"
                  label="Səfərdə"
                  count={vehicles.onTrip ?? 0}
                  total={vehicles.total ?? 0}
                />
                <StatusRow
                  dotCls="bg-amber-500"
                  barCls="bg-amber-500"
                  label="Təmirdə"
                  count={vehicles.inMaintenance ?? 0}
                  total={vehicles.total ?? 0}
                />
                <StatusRow
                  dotCls="bg-slate-400"
                  barCls="bg-slate-400"
                  label="Deaktiv"
                  count={vehicles.inactive ?? 0}
                  total={vehicles.total ?? 0}
                />
              </ul>
            </>
          )}
        </Card>

        {/* Sürücülər */}
        <Card
          title="Sürücülər"
          icon="🧑‍✈️"
          action={
            <Link to="/transport/drivers" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={3} />
          ) : (drivers.total ?? 0) === 0 ? (
            <EmptyState
              icon="🧑‍✈️"
              title="Sürücü yoxdur"
              description="Hələ sürücü qeydiyyata alınmayıb."
            />
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                Cəmi {drivers.total} sürücü
              </p>
              <ul>
                <StatusRow
                  dotCls="bg-emerald-500"
                  barCls="bg-emerald-500"
                  label="Hazırdır"
                  count={drivers.available ?? 0}
                  total={drivers.total ?? 0}
                />
                <StatusRow
                  dotCls="bg-blue-500"
                  barCls="bg-blue-500"
                  label="Səfərdə"
                  count={drivers.onTrip ?? 0}
                  total={drivers.total ?? 0}
                />
              </ul>
            </>
          )}
        </Card>

        {/* Ayın sürücüləri */}
        <Card title="Ayın sürücüləri" icon="🏆">
          {loading ? (
            <ListSkeleton rows={3} />
          ) : topDrivers.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="Məlumat yoxdur"
              description="Bu ay hələ tamamlanmış çatdırılma yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topDrivers.map((t, i) => (
                <li key={t.driverId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-6 text-center text-lg" aria-hidden="true">
                    {RANK_ICONS[i] ?? `${i + 1}.`}
                  </span>
                  <Avatar name={t.fullName} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {t.fullName}
                  </p>
                  <Badge tone="green" dot={false}>
                    {t.deliveredCount} çatdırılma
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Vəsiqəsi bitən sürücülər — yalnız varsa */}
      {!loading && expiring.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3.5">
            <span aria-hidden="true">⚠️</span>
            <h3 className="text-sm font-semibold tracking-tight text-amber-800">
              Vəsiqəsi bitən sürücülər — 30 gün ərzində
            </h3>
          </div>
          <ul className="divide-y divide-amber-100 px-5 py-2">
            {expiring.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={d.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{d.fullName}</p>
                  <p className="text-xs text-amber-700">
                    Vəsiqə № <span className="font-mono">{d.licenseNumber}</span>
                  </p>
                </div>
                <Badge tone="yellow">Bitir: {fmtDate(d.licenseExpiryDate)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Son çatdırılmalar */}
      <Card
        title="Son çatdırılmalar"
        icon="🕘"
        action={
          <Link to="/transport/deliveries" className="text-xs font-medium text-indigo-600 hover:underline">
            Hamısına bax →
          </Link>
        }
      >
        {loading ? (
          <ListSkeleton rows={6} />
        ) : recentDeliveries.length === 0 ? (
          <EmptyState
            icon="🚚"
            title="Çatdırılma yoxdur"
            description="Hələ heç bir çatdırılma qeydə alınmayıb."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentDeliveries.map((d) => (
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
                  <span className="hidden sm:block text-xs text-slate-500 font-mono">
                    {d.vehiclePlate}
                  </span>
                  <DeliveryStatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
