import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
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

// Gecikmiş və yaxınlaşan texniki xidmətlər üçün xəbərdarlıq zolağı.
function MaintenanceDueBanner({ due, onSchedule }) {
  if (!due || due.length === 0) return null;

  const overdue = due.filter((d) => d.isOverdue);
  const soon = due.filter((d) => !d.isOverdue);

  const dueLabel = (d) => {
    if (d.isOverdue) return `${Math.abs(d.daysUntilDue)} gün gecikib`;
    if (d.daysUntilDue === 0) return 'bu gün';
    return `${d.daysUntilDue} gün qalıb`;
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
      <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🔧</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Texniki xidmət diqqət tələb edir</p>
            <p className="text-xs text-amber-700/80">
              {overdue.length > 0 && `${overdue.length} gecikmiş`}
              {overdue.length > 0 && soon.length > 0 && ' · '}
              {soon.length > 0 && `${soon.length} yaxınlaşan`} servis
            </p>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-amber-200/50">
        {due.map((d) => (
          <li key={d.vehicleId} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${d.isOverdue ? 'bg-red-500' : 'bg-amber-500'}`}
                aria-hidden="true"
              />
              <div>
                <span className="font-mono text-sm font-semibold text-slate-800">{d.vehiclePlate}</span>
                <span className="ml-2 text-xs text-slate-500">{d.brand} {d.model}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-xs tabular-nums text-slate-500">{fmtDate(d.dueDate)}</p>
                <p className={`text-xs font-semibold ${d.isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
                  {dueLabel(d)}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={onSchedule}>Servis qeyd et</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VehicleLogsPage() {
  const [tab, setTab] = useState('fuel');
  const [fuel, setFuel] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [panel, setPanel] = useState(null); // 'fuel' | 'maintenance'
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    const params = vehicleFilter ? { vehicleId: vehicleFilter } : {};
    setLoading(true);
    Promise.all([
      api.get('/fuel-records', { params }).then(({ data }) => setFuel(data)),
      api.get('/maintenance-records', { params }).then(({ data }) => setMaintenance(data)),
    ])
      .catch(() => notify.error('Qeydlər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [vehicleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const [due, setDue] = useState([]);

  useEffect(() => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
    api.get('/maintenance-due').then(({ data }) => setDue(data)).catch(() => {});
  }, []);

  const openPanel = (type) => {
    reset({
      vehicleId: vehicleFilter || '', driverId: '', date: new Date().toISOString().slice(0, 10),
      liters: '', cost: '', odometerKm: '', note: '', description: '', nextDueDate: '',
    });
    setError(null);
    setPanel(type);
  };

  const onSubmit = async (values) => {
    try {
      if (panel === 'fuel') {
        await api.post('/fuel-records', {
          vehicleId: Number(values.vehicleId),
          driverId: values.driverId ? Number(values.driverId) : null,
          date: values.date,
          liters: Number(values.liters),
          cost: Number(values.cost),
          odometerKm: values.odometerKm ? Number(values.odometerKm) : null,
          note: values.note || null,
        });
        notify.success('Yanacaq qeydi əlavə olundu.');
      } else {
        await api.post('/maintenance-records', {
          vehicleId: Number(values.vehicleId),
          date: values.date,
          description: values.description,
          cost: Number(values.cost),
          nextDueDate: values.nextDueDate || null,
        });
        notify.success('Təmir qeydi əlavə olundu.');
      }
      setPanel(null);
      load();
      api.get('/maintenance-due').then(({ data }) => setDue(data)).catch(() => {});
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message ?? 'Xəta baş verdi.'
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Yanacaq və Təmir"
        description="Avtomobil parkı üzrə yanacaq və texniki xidmət qeydləri"
        actions={
          <>
            <Button onClick={() => openPanel('fuel')}>+ Yanacaq qeydi</Button>
            <Button variant="secondary" onClick={() => openPanel('maintenance')}>
              + Təmir qeydi
            </Button>
          </>
        }
      />

      <MaintenanceDueBanner due={due} onSchedule={() => openPanel('maintenance')} />

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <Tabs
          className="flex-1 min-w-0"
          tabs={[
            { key: 'fuel', label: 'Yanacaq', icon: '⛽', count: fuel.length },
            { key: 'maintenance', label: 'Təmir', icon: '🔧', count: maintenance.length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Select
          className="w-52"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">Bütün avtomobillər</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plateNumber}</option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        {tab === 'fuel' ? (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Sürücü</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Mənbə</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Litr</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Odometr</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qeyd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows rows={6} cols={8} />
                ) : (
                  fuel.map((f) => (
                    <tr key={f.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                        {fmtDate(f.date)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{f.vehiclePlate}</td>
                      <td className="px-6 py-3.5 text-slate-600">{f.driverName || '—'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{f.fuelSourceName || '—'}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">
                        {Number(f.liters ?? 0).toLocaleString('az-AZ')}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <Badge tone="blue" dot={false}>{fmtMoney(f.cost)}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                        {f.odometerKm != null ? `${Number(f.odometerKm).toLocaleString('az-AZ')} km` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 max-w-48 truncate">{f.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && fuel.length === 0 && (
              <EmptyState
                icon="⛽"
                title="Yanacaq qeydi yoxdur"
                description="Seçilmiş filtr üzrə yanacaq qeydi tapılmadı."
                action={<Button onClick={() => openPanel('fuel')}>+ Yanacaq qeydi</Button>}
              />
            )}
          </>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Təsvir</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Növbəti baxış</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows rows={6} cols={5} />
                ) : (
                  maintenance.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                        {fmtDate(m.date)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{m.vehiclePlate}</td>
                      <td className="px-6 py-3.5 text-slate-700 max-w-72 truncate" title={m.description}>
                        {m.description}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <Badge tone="yellow" dot={false}>{fmtMoney(m.cost)}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 tabular-nums">
                        {m.nextDueDate ? fmtDate(m.nextDueDate) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && maintenance.length === 0 && (
              <EmptyState
                icon="🔧"
                title="Təmir qeydi yoxdur"
                description="Seçilmiş filtr üzrə təmir qeydi tapılmadı."
                action={
                  <Button onClick={() => openPanel('maintenance')}>+ Təmir qeydi</Button>
                }
              />
            )}
          </>
        )}
      </div>

      <SlideOver
        open={Boolean(panel)}
        title={panel === 'fuel' ? 'Yanacaq qeydi' : 'Təmir qeydi'}
        subtitle={panel === 'fuel' ? 'Yanacaq doldurma məlumatları' : 'Texniki xidmət məlumatları'}
        onClose={() => setPanel(null)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Avtomobil" required {...register('vehicleId', { required: true })}>
              <option value="">Seçin...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plateNumber}</option>
              ))}
            </Select>
            <Input label="Tarix" required type="date" {...register('date', { required: true })} />
          </div>

          {panel === 'fuel' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Litr"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('liters', { required: true })}
                />
                <Input
                  label="Məbləğ (₼)"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('cost', { required: true })}
                />
                <Input label="Odometr (km)" type="number" min="0" {...register('odometerKm')} />
              </div>
              <Select label="Sürücü" {...register('driverId')}>
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </Select>
              <Input label="Qeyd" placeholder="Əməliyyat barədə qeyd..." {...register('note')} />
            </>
          ) : (
            <>
              <Textarea
                label="Təsvir"
                required
                rows={2}
                placeholder="Yağ dəyişimi, əyləc bəndi..."
                {...register('description', { required: true })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Məbləğ (₼)"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('cost', { required: true })}
                />
                <Input label="Növbəti baxış" type="date" {...register('nextDueDate')} />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
