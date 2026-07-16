import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import { Avatar, Button, ConfirmDialog, EmptyState } from '../../components/ui';
import {
  Card,
  DeliveryStatusBadge,
  DELIVERY_ACTIONS,
  fmtDate,
  fmtDateTime,
} from './transportShared';
import VehicleRouteMap from './VehicleRouteMap';

// Şaquli status timeline addımı.
function TimelineStep({ icon, title, date, done, tone = 'indigo', last = false, lineActive = false }) {
  const doneCls = {
    indigo: 'bg-indigo-600 text-white ring-4 ring-indigo-100',
    blue: 'bg-blue-600 text-white ring-4 ring-blue-100',
    green: 'bg-emerald-600 text-white ring-4 ring-emerald-100',
    red: 'bg-red-600 text-white ring-4 ring-red-100',
  }[tone];
  const lineCls = {
    indigo: 'bg-indigo-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
  }[tone];

  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition-colors ${
            done ? doneCls : 'border-2 border-dashed border-slate-200 bg-white text-slate-300'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
        {!last && (
          <span
            className={`w-0.5 flex-1 my-1 rounded-full ${lineActive ? lineCls : 'bg-slate-200'}`}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={`min-w-0 ${last ? 'pb-1' : 'pb-8'}`}>
        <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>
          {title}
        </p>
        <p className={`mt-0.5 text-xs tabular-nums ${done ? 'text-slate-500' : 'text-slate-300'}`}>
          {done ? (date ? fmtDateTime(date) : '') : 'Gözlənilir'}
        </p>
      </div>
    </li>
  );
}

function SideInfo({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'start' | 'complete' | 'cancel'
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/deliveries/${id}`)
      .then(({ data }) => setDelivery(data))
      .catch((err) => setError(err.response?.data?.message ?? 'Çatdırılma məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${id}/${pendingAction}`);
      notify.success(DELIVERY_ACTIONS[pendingAction].success);
      setPendingAction(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-44 rounded bg-slate-200" />
        <div className="h-40 rounded-2xl bg-slate-200/70" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="h-80 rounded-2xl bg-slate-100 xl:col-span-2" />
          <div className="space-y-4">
            <div className="h-36 rounded-2xl bg-slate-100" />
            <div className="h-36 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <EmptyState
          icon="🔍"
          title="Çatdırılma tapılmadı"
          description={error ?? 'Bu identifikatorla çatdırılma mövcud deyil.'}
          action={
            <Link to="/transport/deliveries">
              <Button variant="secondary">← Çatdırılmalar siyahısına qayıt</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const d = delivery;
  const cancelled = d.status === 4;
  const started = Boolean(d.startedAtUtc);
  const delivered = Boolean(d.deliveredAtUtc);
  const action = pendingAction ? DELIVERY_ACTIONS[pendingAction] : null;

  return (
    <div>
      <Link
        to="/transport/deliveries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        ← Çatdırılmalar siyahısı
      </Link>

      {/* Başlıq kartı */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm mb-6">
        <div
          className={`h-2 bg-gradient-to-r ${
            cancelled
              ? 'from-red-500 to-rose-500'
              : delivered
                ? 'from-emerald-500 to-teal-500'
                : 'from-indigo-600 to-blue-600'
          }`}
        />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                  {d.number}
                </h2>
                <DeliveryStatusBadge status={d.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{d.customerName}</span>
                {d.cargoDescription ? ` • ${d.cargoDescription}` : ''}
                {d.cargoWeightKg != null
                  ? ` • ${Number(d.cargoWeightKg).toLocaleString('az-AZ')} kq`
                  : ''}
              </p>
              {d.note && <p className="mt-1 text-xs text-slate-400">📝 {d.note}</p>}
            </div>

            {/* Kontekstə görə əməliyyatlar */}
            <div className="flex items-center gap-2 shrink-0">
              {d.status === 1 && (
                <>
                  <Button onClick={() => setPendingAction('start')}>🚀 Yola sal</Button>
                  <Button
                    variant="secondary"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    onClick={() => setPendingAction('cancel')}
                  >
                    Ləğv et
                  </Button>
                </>
              )}
              {d.status === 2 && (
                <>
                  <Button onClick={() => setPendingAction('complete')}>✅ Tamamla</Button>
                  <Button
                    variant="secondary"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    onClick={() => setPendingAction('cancel')}
                  >
                    Ləğv et
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Status timeline — mərkəzi element */}
        <Card title="Çatdırılma gedişatı" icon="🧭" className="xl:col-span-2">
          <ol className="pt-1">
            <TimelineStep
              icon="📋"
              title="Yaradıldı"
              date={d.createdDate}
              done
              tone="indigo"
              lineActive={started || cancelled}
            />
            {(!cancelled || started) && (
              <TimelineStep
                icon="🚚"
                title="Yola düşdü"
                date={d.startedAtUtc}
                done={started}
                tone="blue"
                last={false}
                lineActive={cancelled ? true : delivered}
              />
            )}
            {cancelled ? (
              <TimelineStep icon="❌" title="Ləğv edilib" done tone="red" last />
            ) : (
              <TimelineStep
                icon="✅"
                title="Çatdırıldı"
                date={d.deliveredAtUtc}
                done={delivered}
                tone="green"
                last
              />
            )}
          </ol>
        </Card>

        {/* Bu reysin öz GPS izi — yola düşməyibsə iz də yoxdur */}
        {started && (
          <Card
            title="Bu reysin GPS izi"
            icon="🛰️"
            className="xl:col-span-2 xl:order-3"
            action={
              <span className="font-mono text-[11px] font-medium text-slate-400">
                {d.vehiclePlate}
              </span>
            }
          >
            <VehicleRouteMap
              deliveryId={d.id}
              vehicleStatus={delivered ? 1 : 2}
              emptyText="Bu reys üçün GPS izi qeydə alınmayıb."
            />
          </Card>
        )}

        {/* Yan panel */}
        <div className="space-y-4">
          <Card title="Marşrut" icon="🗺️">
            <div className="space-y-4">
              <SideInfo label="Haradan">
                <span className="flex items-start gap-2">
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-indigo-500 bg-white" />
                  {d.fromAddress}
                </span>
              </SideInfo>
              <SideInfo label="Haraya">
                <span className="flex items-start gap-2">
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  {d.toAddress}
                </span>
              </SideInfo>
              <SideInfo label="Planlaşdırılan tarix">
                <span className="tabular-nums">{fmtDate(d.scheduledDate)}</span>
              </SideInfo>
            </div>
          </Card>

          <Card title="Avtomobil" icon="🚛">
            {d.vehicleId ? (
              <Link
                to={`/transport/vehicles/${d.vehicleId}`}
                className="group flex items-center justify-between gap-3"
              >
                <span className="font-mono text-base font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {d.vehiclePlate}
                </span>
                <span className="text-xs font-medium text-indigo-600 group-hover:underline">
                  Profilə bax →
                </span>
              </Link>
            ) : (
              <span className="font-mono text-base font-semibold text-slate-800">
                {d.vehiclePlate ?? '—'}
              </span>
            )}
          </Card>

          <Card title="Sürücü" icon="🧑‍✈️">
            <div className="flex items-center gap-3">
              <Avatar name={d.driverName ?? ''} />
              <p className="text-sm font-medium text-slate-800">{d.driverName ?? '—'}</p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={action?.title}
        message={action ? action.message(d) : ''}
        confirmText={action?.confirmText}
        danger={action?.danger}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
