import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  StatCard,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  Tabs,
} from '../../components/ui';
import { fmtMoney, fmtDate } from './transportShared';

// Mənbə tipləri — backend FuelSourceType enum-u ilə uyğun.
const SOURCE_TYPES = {
  1: { text: 'Öz anbarımız', tone: 'blue', icon: '🛢️' },
  2: { text: 'Xarici məntəqə', tone: 'slate', icon: '⛽' },
};

const DEPOT = 1;

const fmtLiters = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })} L`;

const fmtKm = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 1 })} km`;

// Sərfiyyat nə qədər yüksəkdirsə, o qədər narahatedici rəng.
const consumptionTone = (l100) => {
  if (!l100) return 'slate';
  if (l100 >= 40) return 'red';
  if (l100 >= 25) return 'yellow';
  return 'green';
};

// Anbar qalığını göstərən doluluq zolağı.
function StockBar({ current, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
  const color = pct <= 15 ? 'bg-red-500' : pct <= 35 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold tabular-nums text-slate-700">{fmtLiters(current)}</span>
        <span className="text-slate-400 tabular-nums">/ {fmtLiters(capacity)} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FuelTransferPage() {
  const [tab, setTab] = useState('transfer');
  const [sources, setSources] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // 'transfer' | 'source' | 'replenish'
  const [replenishTarget, setReplenishTarget] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, watch, formState } = useForm();
  const selectedSourceId = watch('fuelSourceId');
  const selectedSource = sources.find((s) => String(s.id) === String(selectedSourceId));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/fuel/sources').then(({ data }) => setSources(data)),
      api.get('/fuel/consumption').then(({ data }) => setSummary(data)),
      api.get('/fuel-records').then(({ data }) => setRecords(data)),
    ])
      .catch(() => notify.error('Yanacaq məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
  }, []);

  const openTransfer = () => {
    reset({
      fuelSourceId: '', vehicleId: '', driverId: '',
      date: new Date().toISOString().slice(0, 10),
      liters: '', cost: '', odometerKm: '', note: '',
    });
    setError(null);
    setPanel('transfer');
  };

  const openSource = () => {
    reset({ name: '', type: DEPOT, address: '', capacityLiters: '' });
    setError(null);
    setPanel('source');
  };

  const openReplenish = (source) => {
    reset({ liters: '', note: '' });
    setError(null);
    setReplenishTarget(source);
    setPanel('replenish');
  };

  const showError = (err) => {
    const data = err.response?.data;
    setError(
      data?.errors
        ? Object.values(data.errors).flat().join(' ')
        : data?.message ?? 'Xəta baş verdi.',
    );
  };

  const onSubmit = async (values) => {
    try {
      if (panel === 'transfer') {
        await api.post('/fuel/transfers', {
          fuelSourceId: Number(values.fuelSourceId),
          vehicleId: Number(values.vehicleId),
          driverId: values.driverId ? Number(values.driverId) : null,
          date: values.date,
          liters: Number(values.liters),
          cost: Number(values.cost),
          odometerKm: values.odometerKm ? Number(values.odometerKm) : null,
          note: values.note || null,
        });
        notify.success('Yanacaq köçürüldü.');
      } else if (panel === 'source') {
        await api.post('/fuel/sources', {
          name: values.name,
          type: Number(values.type),
          address: values.address || null,
          capacityLiters: Number(values.capacityLiters),
        });
        notify.success('Yanacaq mənbəyi yaradıldı.');
      } else {
        await api.post(`/fuel/sources/${replenishTarget.id}/replenish`, {
          liters: Number(values.liters),
          note: values.note || null,
        });
        notify.success('Anbara yanacaq mədaxil olundu.');
      }
      setPanel(null);
      load();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Yanacaq köçürməsi"
        description="Hansı avtomobilə hardan nə qədər yanacaq verilib və GPS məsafəsinə görə km başına nə qədər sərf edir"
        actions={
          <>
            <Button onClick={openTransfer}>+ Yanacaq köçür</Button>
            <Button variant="secondary" onClick={openSource}>+ Mənbə</Button>
          </>
        }
      />

      {/* Park üzrə xülasə */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          icon="⛽"
          accent="blue"
          value={fmtLiters(summary?.totalLiters)}
          label="Ümumi köçürülən yanacaq"
          sub={`${summary?.vehicles?.reduce((s, v) => s + v.transferCount, 0) ?? 0} köçürmə`}
        />
        <StatCard
          loading={loading}
          icon="🛣️"
          accent="indigo"
          value={fmtKm(summary?.totalDistanceKm)}
          label="GPS üzrə ümumi məsafə"
          sub="Bütün avtomobillər"
        />
        <StatCard
          loading={loading}
          icon="📊"
          accent="amber"
          value={`${Number(summary?.fleetLitersPer100Km ?? 0).toLocaleString('az-AZ')} L`}
          label="Park üzrə orta sərfiyyat"
          sub="100 km-ə düşən yanacaq"
        />
        <StatCard
          loading={loading}
          icon="🛢️"
          accent="emerald"
          value={fmtLiters(summary?.depotLitersRemaining)}
          label="Anbar qalığı"
          sub="Öz anbarlarımızda"
        />
      </div>

      <Tabs
        className="mb-4"
        tabs={[
          { key: 'transfer', label: 'Sərfiyyat', icon: '📊', count: summary?.vehicles?.length ?? 0 },
          { key: 'sources', label: 'Mənbələr', icon: '🛢️', count: sources.length },
          { key: 'history', label: 'Köçürmə tarixçəsi', icon: '📋', count: records.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'transfer' && (
        <ConsumptionTable summary={summary} loading={loading} onTransfer={openTransfer} />
      )}

      {tab === 'sources' && (
        <SourcesGrid
          sources={sources}
          loading={loading}
          onReplenish={openReplenish}
          onCreate={openSource}
        />
      )}

      {tab === 'history' && (
        <HistoryTable records={records} loading={loading} onTransfer={openTransfer} />
      )}

      {/* ---------- Panellər ---------- */}
      <SlideOver
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={
          panel === 'transfer'
            ? 'Yanacaq köçür'
            : panel === 'source'
              ? 'Yeni yanacaq mənbəyi'
              : `Anbara mədaxil — ${replenishTarget?.name ?? ''}`
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {panel === 'transfer' && (
            <>
              <Select label="Mənbə (hardan)" required {...register('fuelSourceId', { required: true })}>
                <option value="">Seçin…</option>
                {sources
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {SOURCE_TYPES[s.type]?.icon} {s.name}
                      {s.type === DEPOT ? ` — qalıq ${fmtLiters(s.currentLiters)}` : ''}
                    </option>
                  ))}
              </Select>

              {selectedSource?.type === DEPOT && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-blue-800">
                    Anbar qalığı — köçürmə bu qalıqdan çıxılacaq
                  </p>
                  <StockBar
                    current={selectedSource.currentLiters}
                    capacity={selectedSource.capacityLiters}
                  />
                </div>
              )}

              <Select label="Avtomobil (hara)" required {...register('vehicleId', { required: true })}>
                <option value="">Seçin…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} — {v.brand} {v.model}
                  </option>
                ))}
              </Select>

              <Select label="Sürücü" {...register('driverId')}>
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </Select>

              <Input label="Tarix" type="date" required {...register('date', { required: true })} />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Litr"
                  type="number"
                  step="0.01"
                  required
                  {...register('liters', { required: true })}
                />
                <Input label="Məbləğ (₼)" type="number" step="0.01" required {...register('cost', { required: true })} />
              </div>

              <Input label="Odometr (km)" type="number" {...register('odometerKm')} />
              <Textarea label="Qeyd" rows={2} {...register('note')} />
            </>
          )}

          {panel === 'source' && (
            <>
              <Input label="Ad" required {...register('name', { required: true })} />
              <Select label="Tip" required {...register('type', { required: true })}>
                <option value={1}>🛢️ Öz anbarımız (stok izlənir)</option>
                <option value={2}>⛽ Xarici doldurma məntəqəsi</option>
              </Select>
              <Input label="Ünvan" {...register('address')} />
              <Input
                label="Tutum (litr)"
                type="number"
                step="0.01"
                required
                {...register('capacityLiters', { required: true })}
              />
            </>
          )}

          {panel === 'replenish' && (
            <>
              {replenishTarget && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <StockBar
                    current={replenishTarget.currentLiters}
                    capacity={replenishTarget.capacityLiters}
                  />
                </div>
              )}
              <Input
                label="Mədaxil olunan litr"
                type="number"
                step="0.01"
                required
                {...register('liters', { required: true })}
              />
              <Textarea label="Qeyd" rows={2} {...register('note')} />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={formState.isSubmitting}>
              {panel === 'transfer' ? 'Köçür' : panel === 'source' ? 'Yarat' : 'Mədaxil et'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPanel(null)}>
              Ləğv et
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}

// Km başına sərfiyyat — GPS məsafəsi ilə köçürülmüş yanacağın nisbəti.
function ConsumptionTable({ summary, loading, onTransfer }) {
  const rows = summary?.vehicles ?? [];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80 text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Köçürülən</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">GPS məsafə</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">L / 100 km</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">L / km</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Xərc / km</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Ümumi xərc</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows rows={5} cols={7} />
          ) : (
            rows.map((r) => (
              <tr key={r.vehicleId} className="transition-colors hover:bg-slate-50/60">
                <td className="px-6 py-3.5">
                  <p className="font-mono text-xs font-semibold text-slate-700">{r.plateNumber}</p>
                  <p className="text-xs text-slate-400">{r.brand} {r.model}</p>
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">
                  {fmtLiters(r.totalLiters)}
                  <span className="ml-1 text-xs text-slate-400">({r.transferCount})</span>
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums text-slate-600">{fmtKm(r.distanceKm)}</td>
                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                  {r.litersPer100Km > 0 ? (
                    <Badge tone={consumptionTone(r.litersPer100Km)} dot={false}>
                      {Number(r.litersPer100Km).toLocaleString('az-AZ')} L
                    </Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                  {r.litersPerKm > 0 ? Number(r.litersPerKm).toLocaleString('az-AZ') : '—'}
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                  {r.costPerKm > 0 ? fmtMoney(r.costPerKm) : '—'}
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums font-medium text-slate-700">
                  {fmtMoney(r.totalCost)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <EmptyState
          icon="📊"
          title="Sərfiyyat məlumatı yoxdur"
          description="Avtomobilə yanacaq köçürüldükdən sonra GPS məsafəsinə görə sərfiyyat burada hesablanacaq."
          action={<Button onClick={onTransfer}>+ Yanacaq köçür</Button>}
        />
      )}
    </div>
  );
}

function SourcesGrid({ sources, loading, onReplenish, onCreate }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <SkeletonRows rows={3} cols={3} />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <EmptyState
          icon="🛢️"
          title="Yanacaq mənbəyi yoxdur"
          description="Yanacaq köçürmək üçün əvvəlcə anbar və ya doldurma məntəqəsi əlavə edin."
          action={<Button onClick={onCreate}>+ Mənbə</Button>}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sources.map((s) => {
        const type = SOURCE_TYPES[s.type] ?? SOURCE_TYPES[2];
        const isDepot = s.type === DEPOT;
        return (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  <span className="mr-1" aria-hidden="true">{type.icon}</span>
                  {s.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{s.address || '—'}</p>
              </div>
              <Badge tone={type.tone} dot={false}>{type.text}</Badge>
            </div>

            {isDepot ? (
              <StockBar current={s.currentLiters} capacity={s.capacityLiters} />
            ) : (
              <p className="text-xs text-slate-400">Xarici mənbə — stok izlənmir.</p>
            )}

            <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-sm font-semibold tabular-nums text-slate-700">
                  {fmtLiters(s.totalTransferredLiters)}
                </p>
                <p className="text-xs text-slate-400">
                  köçürülüb · {s.transferCount} əməliyyat
                </p>
              </div>
              {isDepot && (
                <Button size="sm" variant="secondary" onClick={() => onReplenish(s)}>
                  + Mədaxil
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTable({ records, loading, onTransfer }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80 text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tarix</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mənbə (hardan)</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avtomobil (hara)</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sürücü</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Litr</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Odometr</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows rows={6} cols={7} />
          ) : (
            records.map((f) => (
              <tr key={f.id} className="transition-colors hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-slate-500">{fmtDate(f.date)}</td>
                <td className="px-6 py-3.5 text-slate-600">{f.fuelSourceName || '—'}</td>
                <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{f.vehiclePlate}</td>
                <td className="px-6 py-3.5 text-slate-600">{f.driverName || '—'}</td>
                <td className="px-6 py-3.5 text-right tabular-nums font-medium text-slate-700">
                  {fmtLiters(f.liters)}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-right">
                  <Badge tone="blue" dot={false}>{fmtMoney(f.cost)}</Badge>
                </td>
                <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                  {f.odometerKm != null ? fmtKm(f.odometerKm) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && records.length === 0 && (
        <EmptyState
          icon="📋"
          title="Köçürmə yoxdur"
          description="Hələ heç bir yanacaq köçürməsi qeydə alınmayıb."
          action={<Button onClick={onTransfer}>+ Yanacaq köçür</Button>}
        />
      )}
    </div>
  );
}
